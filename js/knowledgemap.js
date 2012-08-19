var KnowledgeMap = function( canvasId, dataTree, onClick ) {

  this.map;
  
  this.onClick = onClick;


  this.mapTypes = {};
  this.centerLatLng = new google.maps.LatLng(-3.7252425870799999, -1.0545898437500001);
  this.mapOptions = {
    zoom: 9,
    center: this.centerLatLng,
    streetViewControl: false,
    mapTypeControl: false,
    zoomControl: false
  };

  this.canvasId = canvasId;

  // Array of nodes on GMap
  this.markersArray = [];
  this.nodesTree = dataTree;





  this.render = function() {

    var etot = this;

    skyMapTypeOptions = {
      getTileUrl: function(coord, zoom) {
        return etot.getHorizontallyRepeatingTileUrl(coord, zoom, function(coord, zoom) {
          return "http://mw1.google.com/mw-planetary/sky/skytiles_v1/" +
                  coord.x + "_" + coord.y + '_' + zoom + '.jpg';

        });
      },
      tileSize: new google.maps.Size(256, 256),
      isPng: false,
      maxZoom: 13,
      radius: 57.2957763671875,
      name: 'Sky'
    };

    map = new google.maps.Map(document.getElementById(this.canvasId), this.mapOptions);
    // add the new map types to map.mapTypes
    var skyMapType = new google.maps.ImageMapType( skyMapTypeOptions );
    // start with the sky map type
    map.mapTypes.set('sky', skyMapType);
    map.setMapTypeId('sky');




    // Create your map and overlay
    MyOverlay.prototype = new google.maps.OverlayView();
    MyOverlay.prototype.onAdd = function() { }
    MyOverlay.prototype.onRemove = function() { }
    MyOverlay.prototype.draw = function() { }
    function MyOverlay(map) { this.setMap(map); }

    var overlay = new MyOverlay(map);
    
    // flag to check if we already went through tree rendering procedure
    var treeIsRendered = false;
    google.maps.event.addListener(map, 'idle', function() {
      
      // Try converting X Y coordinates to Lat Lng for nodes
      if ( ! treeIsRendered ) {
        // projection can't be obtained, unless map has finished loading
        var projection = overlay.getProjection();
        // add Lat,Lng coordinates to Map Nodes
        etot.addLatLng(etot.nodesTree.nodes, projection)

        // rendering markers
        etot.clearMapFromMakers();

        for ( id in etot.nodesTree.nodes ) {
          var node = etot.nodesTree.nodes[id];
          var markerLatLng = new google.maps.LatLng( node.lat, node.lng  );

          var marker = new MarkerWithLabel({
            position: markerLatLng,
            'map': map,
            icon: node.marker_image,
            labelText: node.label,
            labelClass: "node_label", // the CSS class for the label
            labelVisible: true,
            nodeId : id
          });

          // catch onClick event for the marker
          google.maps.event.addListener(marker, 'click', function() { 
            // trigger callback function attached to a node
            etot.onClick( this.nodeId );
          });

          // populate markers array
          etot.markersArray.push( marker );
        };

        // draw the lines that connect nodes
        etot.drawPolylines();

        // set state flag, in order not to re-render the map, once next
        // 'idle' event is trigerred
        treeIsRendered = true;

      }


    });
  };





  // Normalizes the tile URL so that tiles repeat across the x axis (horizontally) like the
  // standard Google map tiles.
  // code taken from this example
  // http://gmaps-samples-v3.googlecode.com/svn/trunk/planetary-maptypes/planetary-maptypes.html
  this.getHorizontallyRepeatingTileUrl = function(coord, zoom, urlfunc) {
    var y = coord.y;
    var x = coord.x;

    // tile range in one direction range is dependent on zoom level
    // 0 = 1 tile, 1 = 2 tiles, 2 = 4 tiles, 3 = 8 tiles, etc
    var tileRange = 1 << zoom;

    // don't repeat across y-axis (vertically)
    if (y < 0 || y >= tileRange) {
      return null;
    }

    // repeat across x-axis
    if (x < 0 || x >= tileRange) {
      x = (x % tileRange + tileRange) % tileRange;
    }

    return urlfunc({x:x,y:y}, zoom)
  }

  this.getMarsTileUrl = function(baseUrl, coord, zoom) {
    var bound = Math.pow(2, zoom);
    var x = coord.x;
    var y = coord.y;
    var quads = ['t'];

    for (var z = 0; z < zoom; z++) {
      bound = bound / 2;
      if (y < bound) {
        if (x < bound) {
          quads.push('q');
        } else {
          quads.push('r');
          x -= bound;
        }
      } else {
        if (x < bound) {
          quads.push('t');
          y -= bound;
        } else {
          quads.push('s');
          x -= bound;
          y -= bound;
        }
      }
    }
    return baseUrl + quads.join('') + ".jpg";
  }




  /*
   * addLatLng
   *
   * Takes nodes object and converts its elements X and Y coordinates to Lat and Lng
   *
   * @nodes Object of Objects, attributes of elements of the tree
   * @projection Projection projection of GMaps Overlay 
   *  https://developers.google.com/maps/documentation/javascript/reference#Projection
   */
  this.addLatLng = function(nodes, projection) {
    for ( id in nodes ) {
      var coord = projection.fromContainerPixelToLatLng(new google.maps.Point( nodes[id].x, nodes[id].y ));
      nodes[id].lat = coord.lat();
      nodes[id].lng = coord.lng();
    }
    return;
  }

  /*
   *  clearMapFromMarkers
   *
   *  Clears Map from marker icons
   */
  this.clearMapFromMakers = function() {
    if (this.markersArray) {
      for (var i = 0; i < this.markersArray.length; i++ ) {
        this.markersArray[i].setMap(null);
      }
    }
  }

  /*
   *  drawPolylines
   *
   *  Draws polylines that connection nodes
   */
  this.drawPolylines = function() {

    for ( id in this.nodesTree.nodes ) {
      var node = this.nodesTree.nodes[id];
      var parent_id = node.parent_id;
      if ( parent_id == null ) { continue; }
      // get coordinates 
      var cc = [
        new google.maps.LatLng( this.nodesTree.nodes[id].lat, this.nodesTree.nodes[id].lng ),
        new google.maps.LatLng( this.nodesTree.nodes[parent_id].lat, this.nodesTree.nodes[parent_id].lng )
      ];

      var pp = new google.maps.Polyline({
        path: cc,
        strokeColor: "#FFFFFF",
        strokeOpacity: 0.6,
        strokeWeight: 1
      });

      pp.setMap(map);
    }
  }




}
