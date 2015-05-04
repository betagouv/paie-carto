$(document).ready(function () {
  window.Embauche.bind(document.querySelector('#input form'));
  $('#next1').click(function () {
    $("#maccueil").removeClass("active");
    $("#madresse").addClass("active");
    $('#page1').hide();
    $('#page2').fadeIn('slow');
  });

  $('#next2').click(function () {
    $("#madresse").removeClass("active");
    $("#simulateur").addClass("active");
    $('#page2').hide();
    $('#page3').fadeIn('slow');
    map.invalidateSize(false);    
  });

  $('#next3').click(function () {
    $("#simulateur").removeClass("active");
    $("#resultat").addClass("active");
    $('#page3').hide();
    $('#page4').fadeIn('slow');     
  });

  var engine = new Bloodhound({
    remote: {url: 'http://api-adresse.data.gouv.fr/search/?q=%QUERY',
    filter: function(list) {
      return $.map(list.features, function(adresse) { return { label: adresse.properties.label, geometry:adresse.geometry }; });
    }
  },
  datumTokenizer: function(datum) {
    return Bloodhound.tokenizers.whitespace(d);

  },
  queryTokenizer: Bloodhound.tokenizers.whitespace
});

  engine.initialize();

  $('#adresse .typeahead').typeahead(null, {
    displayKey:'label',
    source:engine.ttAdapter(),
  }).on('typeahead:selected', function(event, data){            
    console.log(data.geometry);
    L.marker([data.geometry.coordinates[1],data.geometry.coordinates[0]]).addTo(map);
    map.setView(new L.LatLng(data.geometry.coordinates[1],data.geometry.coordinates[0]), 12);
    $.get("http://apicarto.coremaps.com/zoneville/api/beta/zfu",
      {x:data.geometry.coordinates[0],
        y:data.geometry.coordinates[1]
      }).done(function (data){
        console.log(data);
        if (data.result) {
          var source = $("#zonage-template").html();
          var template = Handlebars.compile(source);
          var html = template(data);
          $('#information').html(html);
          $('#information').show();
        }
      })      
    });

  var osm = new L.TileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    { attribution: 'Map data © <a href="http://openstreetmap.org">OpenStreetMap</a> contributors' }
    );
  var map = new L.Map('map', {
    center: [50.691903,3.165524],
    zoom: 10,
    layers: [osm]
  });

  var info = L.control({
    position: 'topright'
  });

  info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
    this.update();
    return this._div;
  };

  // method that we will use to update the control based on feature properties passed
  info.update = function (props) {
    console.log(props);
    this._div.innerHTML = '<h4>ZFU</h4>' +  (props ?
      '<abbr title="Zone Franche Urbaine">ZFU</abbr> de ' + props.commune + '<br/>97% du coût normal (1211 €)'
      : 'Survolez une zone pour connaitre la base d\'éxonération');
  };

  info.addTo(map);
  function style(feature) {
    return {
      fillColor: '#FC4E2A',
      weight: 2,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.7
    };
  }       
  window.debug = map;

  $.ajax({
    url: 'http://apicarto.coremaps.com/zoneville/api/beta/zfu/mapservice',
    datatype: 'json',
    jsonCallback: 'getJson',
    success: loadGeoJson
  });

  var geojson;
L.TopoJSON = L.GeoJSON.extend({  
  addData: function(jsonData) {    
    if (jsonData.type === "Topology") {
      for (key in jsonData.objects) {
        geojson = topojson.feature(jsonData, jsonData.objects[key]);
        L.GeoJSON.prototype.addData.call(this, geojson);
      }
    }    
    else {
      L.GeoJSON.prototype.addData.call(this, jsonData);
    }
  }  
});

var topoLayer = new L.TopoJSON();

$.getJSON('http://localhost:8000/zoneville/api/beta/zrr/mapservice')
  .done(addTopoData);

function addTopoData(topoData){  
  topoLayer.addData(topoData);
  topoLayer.addTo(map);
}
  //   $.ajax({
  //   url: 'http://localhost:8000/zoneville/api/beta/zrr/mapservice',
  //   datatype: 'json',
  //   jsonCallback: 'getJson',
  //   success: loadGeoJson
  // });
  function highlightFeature(e) {
    var layer = e.target
    info.update(layer.feature.properties);
    var layer = e.target;

    layer.setStyle({
      weight: 5,
      color: '#666',
      dashArray: '',
      fillOpacity: 0.7
    });

    if (!L.Browser.ie && !L.Browser.opera) {
      layer.bringToFront();
    }
  }
function BoundingBox(){
var bounds = map.getBounds().getSouthWest().lng + "," +     map.getBounds().getSouthWest().lat + "," + map.getBounds().getNorthEast().lng + "," + map.getBounds().getNorthEast().lat;
return bounds;
}
  function onEachFeature(feature, layer) {
    layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
      click: zoomToFeature
    });
  }
  function loadGeoJson(data) {
    geojsonLayerWells = new L.GeoJSON(data, {
      style: style,
      onEachFeature: onEachFeature
    });
    map.addLayer(geojsonLayerWells);
  };
  
  function resetHighlight(e) {
    geojsonLayerWells.resetStyle(e.target);
    info.update();
  }
  function zoomToFeature(e) {
    map.fitBounds(e.target.getBounds());
  }

  map.invalidateSize(false);

  map.on('moveend', function(){
        console.log(map.getZoom());
        console.log(BoundingBox());
    });
})