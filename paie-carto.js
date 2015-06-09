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
    L.marker([data.geometry.coordinates[1],data.geometry.coordinates[0]]).addTo(map);
    map.setView(new L.LatLng(data.geometry.coordinates[1],data.geometry.coordinates[0]), 12);
    $.get("http://apicarto.coremaps.com/zoneville/api/beta/zfu",
      {x:data.geometry.coordinates[0],
        y:data.geometry.coordinates[1]
      }).done(function (data){
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

  var zone = L.tileLayer.wms("http://apicarto.coremaps.com/geoserver/wms/", {
    layers: 'zrr',
    tiled: true,
    format: 'image/png',
    transparent: true,
    attribution: "SGMAP"
});
  var stamen = new L.StamenTileLayer("toner");
  var map = new L.Map('map', {
    center: [50.691903,3.165524],
    zoom: 10,
    layers: [stamen]
  });

  zone.addTo(map);
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
    if (props !== undefined){
      var targetUrl;

      props.title = '';
      if (props.numzfu !== undefined){
        props.title = 'ZFU - territoire entrepreneur';
        props.nom_comm = props.commune;
        props.exo = 'Vous bénéficiez d\'exonérations fiscales.';
        targetUrl = Embauche.OpenFisca.buildURL({ zone_franche_urbaine: true });
      }
      else{
        props.exo = 'Vous bénéficiez d\'exonérations fiscales et sociales';
        if (props.ber == true){
          props.title += ' BER ';
          targetUrl = Embauche.OpenFisca.buildURL({ bassin_emploi_redynamiser: true });
        }
        if (props.zrr == true){
          props.title += ' ZRR ';
          targetUrl = Embauche.OpenFisca.buildURL({ zone_revitalisation_rurale: true });
        }
        if (props.zrd == true){
          props.title += ' ZRD ';
          targetUrl = Embauche.OpenFisca.buildURL({ zone_restructuration_defense: true });
        }
      }

      var old_sal = parseFloat(document.querySelector('[data-source=salsuperbrut]').innerText.replace(/,/, '.') , 2);

      // old_sal = window.lastResult.salsuperbrut;

      var request = new XMLHttpRequest();

      request.open('get', targetUrl);

      request.onload = (function() {
        if (request.status != 200)
          throw request;

        var data = JSON.parse(request.responseText);
        new_sal = data.values.salsuperbrut;

        props.salaire = new_sal.toFixed(2);
        props.cout = Math.round((new_sal / old_sal) * 100);
        var source = $("#zonage-info").html();
        var template = Handlebars.compile(source);
        this._div.innerHTML = template(props);
      }).bind(this);

      request.onerror = function() {
        throw request;
      }

      request.send();
    }
    else{
      $("select[name='zone_franche_urbaine'] option[value='false']").attr('selected', 'selected');
      $("select[name='bassin_emploi_redynamiser'] option[value='false']").attr('selected', 'selected');
      $("select[name='zone_revitalisation_rurale'] option[value='false']").attr('selected', 'selected');
      $("select[name='zone_restructuration_defense'] option[value='false']").attr('selected', 'selected');
      this._div.innerHTML = 'Survolez une zone pour connaitre la base d\'éxonération';
    }

    /**this._div.innerHTML = '<h4>ZRD/BER/ZRR/ZFU - territoire entrepreneur</h4>' +  (props ?
      title + ' de ' + props.nom_comm + '<br/>'+ exo +'% du coût normal ('+ cout.toFixed(2) +' €)'
      : 'Survolez une zone pour connaitre la base d\'éxonération');**/
  };

  info.addTo(map);
  function style(feature) {
    return {
      fillColor: '#FC4E2A',
      weight: 1,
      opacity: 1,
      color: 'white',
      dashArray: '0',
      fillOpacity: 0.7
    };
  }

  var index_com = [];
  var communesgeojson = {type:"FeatureCollection",features:[]};
  var communelayer = L.geoJson(communesgeojson, {
          color: "#000",
          opacity: 10,
          fillColor: '#fff',

        })
  communelayer.addTo(map);

  map.on('mousemove', function(e) {
    $.getJSON('http://apicarto.coremaps.com/zoneville/api/beta/zrr/mapservice', {lat:e.latlng.lat, lng:e.latlng.lng}).done(
      function (data){
        window.debug = index_com;
        if (data.status){
          if (index_com.indexOf(data.feature.properties.insee) == -1){
            index_com.push(data.feature.properties.insee);
            communesgeojson.features.push(data.feature);
            communelayer.clearLayers();
            communelayer.addData(communesgeojson);
            communelayer.addTo(map);
            communelayer.eachLayer(handleLayerCommune);
          }
        }
      });
});

  $.ajax({
    url: 'http://apicarto.coremaps.com/zoneville/api/beta/zfu/mapservice',
    datatype: 'json',
    jsonCallback: 'getJson',
    success: loadGeoJson
  });

  function handleLayerCommune(layer){  

    layer.setStyle({
      fillColor: 'white',
      weight: 0,
      opacity: 0,
      color: 'white',
      fillOpacity: 0
    });
    info.update(layer.feature.properties);
    layer.on({
      mouseover: highlightFeatureCommune,
      mouseout: resetHighlightCommune,
      click: zoomToFeature
    });
  }
    function resetHighlightCommune(e) {
    communelayer.resetStyle(e.target);
    info.update();
  }
  function highlightFeatureCommune(e) {
    var layer = e.target;
    info.update(layer.feature.properties);
    layer.setStyle({
      fillColor: 'white',
      weight: 2,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0
    });


    if (!L.Browser.ie && !L.Browser.opera) {
      layer.bringToFront();

    }
  }
 

  function highlightFeature(e) {
    var layer = e.target;
    info.update(layer.feature.properties);

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
  });
})