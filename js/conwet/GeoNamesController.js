/*
 *     Copyright (c) 2013 CoNWeT Lab., Universidad Politécnica de Madrid
 *
 *     This file is part of the GeoWidgets Project,
 *
 *     http://conwet.fi.upm.es/geowidgets
 *
 *     Licensed under the GNU General Public License, Version 3.0 (the 
 *     "License"); you may not use this file except in compliance with the 
 *     License.
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     under the License is distributed in the hope that it will be useful, 
 *     but on an "AS IS" BASIS, WITHOUT ANY WARRANTY OR CONDITION,
 *     either express or implied; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 *  
 *     See the GNU General Public License for specific language governing
 *     permissions and limitations under the License.
 *
 *     <http://www.gnu.org/licenses/gpl.txt>.
 *
 */
use("conwet");

conwet.GeoNamesController = Class.create({
    
    initialize: function(gadget){
        this.gadget = gadget;
        this.parser = null;
        var auto = this.gadget.serviceConfiguration.details[0]["auto"];
        if(auto == null || auto == false){
            this.parser = new conwet.parser.ConfigParser(gadget);
        }else{
            this.parser = new conwet.parser.AutoParser(gadget);
        }
    },
    
    _sendSearchRequest: function (service, word, property) {
        this.gadget.clearUI();

        var baseURL = service.url;

        if ((baseURL == "") || (word == "")) {
            this.gadget.showMessage(_("Faltan datos en el formulario."));
            return;
        }

        if (baseURL.indexOf('?') == -1) {
            baseURL = baseURL + '?';
        } else {
            if (baseURL.charAt(baseURL.length - 1) == '&') {
                baseURL = baseURL.slice(0, -1);
            }
        }

 	//var format = new OpenLayers.Format.CSWGetFeatures();	 
        //var result = format.write(options);
        var parameters = {
            q: word,
            maxRows: this.gadget.serviceConfiguration.request[0].maxrows[0].Text,
            lang: this.gadget.serviceConfiguration.request[0].lang[0].Text,
            username: this.gadget.serviceConfiguration.request[0].username[0].Text,
            style: "full"
        };

        this.gadget.showMessage("Solicitando datos al servidor.", true);
        //TODO Gif chulo para esperar
        MashupPlatform.http.makeRequest(baseURL, {
            method: 'GET',
            parameters: parameters,
            onSuccess: function(transport) {
                this.gadget.hideMessage();
                var xmlObject = XMLObjectifier.xmlToJSON(XMLObjectifier.textToXML(transport.responseText));
                this._drawEntities(xmlObject);
            }.bind(this),
            onFailure: function(){
                this.gadget.showError("El servidor no responde.");
            }.bind(this)
        });
    },

    /**
     * This functions shows a list of the results of the search done.
     */
    _drawEntities: function(xmlObject) {
        this.gadget.clearUI();
        
        var entities = xmlObject.geoname;
        var nEntities = entities.length;
        
        if(nEntities < 1)
            return;
        
        for (var i=0; i<nEntities; i++) {
            var entity = entities[i];

            var div = document.createElement("div");
            $(div).addClassName("feature");

            var context = {
                "div"   : div,
                "entity": entity,
                //"url"   : this.gadget._decodeASCII(json[1].sourceServiceURL),
                //"type"  : json[1].sourceServiceType,
                "self"  : this
            };

            var showInfo = this.gadget.serviceConfiguration.results[0].displayInfo;
            var outputText = this.gadget.serviceConfiguration.results[0].outputText;
            
            div.title = "Send event";
            div.observe("click", function(e) {
                this.self.gadget.sendText(this.self.gadget.parseUtils.getDOMValue(this.entity, outputText[0]));
                this.self._showDetails(this.entity);
                //this.self._selectFeature(this.feature, this.div);
            }.bind(context));
            div.observe("mouseover", function(e) {
                this.div.addClassName("highlight");
            }.bind(context), false);
            div.observe("mouseout", function(e) {
                this.div.removeClassName("highlight");
            }.bind(context), false);
            
            //Load the separator character from the service configuration file
            var separator = this.gadget.serviceConfiguration.results[0].separator;
            if(separator == null)
                separator = " ";
            
            var span = document.createElement("span");
            
            for(var x = 0; x < showInfo.length; x++){
                
                //Add the separator between fields
                if(span.innerHTML != null)
                    span.innerHTML += separator;
                
                //If a headchar is defined, add it before the field.
                if(showInfo[x].headChar != null)
                    span.innerHTML += showInfo[x].headChar;
                
                //Add the field text
                span.innerHTML += this.gadget.parseUtils.getDOMValue(entity, showInfo[x]);
                
                //If a trailChar is defined, add it after the field
                if(showInfo[x].trailChar != null)
                    span.innerHTML += showInfo[x].trailChar;
            }
            div.appendChild(span);

            $("list").appendChild(div);
        }
    },
            
            /*
     * Displays more info about the selected entry in the list of features.
     */
    _showDetails: function(entity) {
        $("info").innerHTML = ""; 
        $("info").appendChild(this.parser._entityToHtml(entity));
        
        //var srsConfig = this.gadget.serviceConfiguration.results[0].srs[0];
        //var srs      = this.gadget.parseUtils.getDOMValue(entity, srsConfig);
        var latitudeConfig = this.gadget.serviceConfiguration.results[0].lat[0];
        var longitudeConfig = this.gadget.serviceConfiguration.results[0].lon[0];
        var latitude = this.gadget.parseUtils.getDOMValue(entity, latitudeConfig);
        var longitude = this.gadget.parseUtils.getDOMValue(entity, longitudeConfig);
        var locationInfoConfig = this.gadget.serviceConfiguration.results[0].locationInfo[0];
        var locationInfo = this.gadget.parseUtils.getDOMValue(entity, locationInfoConfig);

        var location = new OpenLayers.LonLat(longitude, latitude);
        /*if (srs && (srs != "")) {
            location = this.gadget.transformer.advancedTransform(location, srs, this.gadget.transformer.DEFAULT.projCode);
        }*/

        //Send the location info (location + name)
        this.gadget.sendLocationInfo(location.lon, location.lat, locationInfo);

    }    
    
});
