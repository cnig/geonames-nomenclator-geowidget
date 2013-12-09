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

conwet.Gadget = Class.create({

    initialize: function() {
        
        this.locationInfoEvent = new conwet.events.Event('location_info_event');
        this.outputTextEvent   = new conwet.events.Event('output_text_event');
        this.searchTextEvent   = new conwet.events.Event('search_text_event');
        
        this.controller = null;

        //Receive multiple values and search with them
        this.searchTextSlot    = new conwet.events.Slot('search_text_slot', function(text) {
            var data;
            try{
                data = JSON.parse(text);
            }catch(e){
                data = text;
            }
            var inputs = $$("input.search");
            
            if(inputs.length > 0){
                if(typeof data == "string"){
                    inputs[0].setValue(data);
                }else if(data != null && data.length > 0){
                    for(var x = 0; x < inputs.length && x < data.length; x++)
                        inputs[x].setValue(data[x]);
                }
                this.launchSearch();
            }
        }.bind(this));

        this.serviceConfiguration = null; //Contains the configuration of the service in use
        this.serviceConfigurationList = []; //Contains the configuration of all the services
        
        new Ajax.Request("js/service-config/geonames.xml", {
            method: 'GET',
            onSuccess: function(transport) {

                this.serviceConfiguration = XMLObjectifier.xmlToJSON(transport.responseXML);
                
                this.service = {
                    name : 'Geonames', 
                    url: 'http://api.geonames.org/search',
                    service_type: 'GEONAMES',
                    type: 'WFS',
                    xmlText: transport.responseText
                };
                
                this.controller = new conwet.GeoNamesController(this);
                
                this.draw();

            }.bind(this),
            onFailure: function(transport) {
                this.showMessage(_("Error al cargar la configuración del servicio"));
            }.bind(this)
        });

        this.servicesPreference = MashupPlatform.widget.getVariable("services");
        
        // Attributes
        this.messageManager = new conwet.ui.MessageManager(3000);
        this.transformer    = new conwet.map.ProjectionTransformer();
        
        this.parseUtils = new conwet.parser.ParseUtils();
    },

    draw: function() {
        var header = $("header");
        conwet.ui.UIUtils.ignoreEvents(header, ["click", "dblclick"]);

        var searchLabel = document.createElement("div");
        $(searchLabel).addClassName("label");
        searchLabel.appendChild(document.createTextNode(_("Topónimo:")));
        header.appendChild(searchLabel);

        //Select with the properties that can be used to search in this service
        this.propertySelect = new StyledElements.StyledSelect();
        //this.propertySelect.addClassName("search"); TEMPORAL!!
        this.propertySelect.addClassName("hidden"); //TEMPORAL!!
        this.propertySelect.addEntries([{label: _('Search by'), value: ''}]);
        this.propertySelect.insertInto(header);
        
        //$(this.propertySelect).hide(); //Temporal
        
        var searchDiv = document.createElement("div");
        $(searchDiv).addClassName("search");
        header.appendChild(searchDiv);
        
        //Text input containing the text to be searched
        this.searchInput = document.createElement("input");
        this.searchInput.type = "text";
        this.searchInput.onkeydown = function(k){
           if(k.keyCode == 13)
               this.launchSearch();
        }.bind(this);
        $(this.searchInput).addClassName("search");
        searchDiv.appendChild(this.searchInput);

        var searchButton = conwet.ui.UIUtils.createButton({
            "classNames": ["search_button"],
            "title"     : _("Buscar topónimo"),
            "value"     : _("Buscar"),
            "onClick"   : this.launchSearch.bind(this)
        });
        header.appendChild(searchButton);

    },
    
    launchSearch: function(){
        this.sendSearch(this.searchInput.value);
        this.controller._sendSearchRequest(this.service, this.searchInput.value, this.propertySelect.getValue());  
    },

    /*
     * This function sends and event with the location info
     */
    sendLocationInfo: function(lon, lat, title) {
        this.locationInfoEvent.send(JSON.stringify([{
            lon: lon,
            lat: lat,
            coordinates: lon + "," + lat,
            title: title
        }]));
    },

    sendText: function(text) {
        this.outputTextEvent.send(text);
    },

    sendSearch: function(text) {
        this.searchTextEvent.send(text);
    },

    

    _selectFeature: function(feature, element) {
        this._deselectAllFeatures();
        element.addClassName("selected");
        this._showDetails(feature);
    },

    _deselectAllFeatures: function() {
        var features = $("chan_items").childNodes;
        for (var i=0; i<features.length; i++) {
            features[i].removeClassName("selected");
        }
    },

    _clearDetails: function() {
        $("info").innerHTML = "";
    },

    clearUI: function() {
        this._clearDetails();
        $("list").innerHTML = "";
    },

    showMessage: function(message, permanent) {
        this.messageManager.showMessage(message, conwet.ui.MessageManager.INFO, permanent);
    },

    hideMessage: function() {
        this.messageManager.hideMessage();
    },

    showError: function(message, permanent) {
        this.messageManager.showMessage(message, conwet.ui.MessageManager.ERROR, permanent);
    }

});
