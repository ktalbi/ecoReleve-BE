define([
    'jquery',
    'underscore',
    'backbone',
    'marionette',

    'moment',
    'dateTimePicker',
    'sweetAlert',

    'ns_form/NsFormsModuleGit',
    'ns_map/ns_map',

    'i18n'

], function(
    $, _, Backbone, Marionette,
    moment, datetime, Swal,
    NsForm, NsMap
) {

    'use strict';

    return Marionette.LayoutView.extend({
        template: 'app/modules/stations/stations.new.tpl.html',
        className: 'full-height white',

        events: {
            'click .js-btn-current-position': 'getCurrentPosition',
            'click .js-btn-save': 'save',

            'focusout input[name="Dat e_"]': 'checkDate',
            'change input[name="LAT"], input[name="LON"]': 'getLatLng',
            'click .tab-link': 'displayTab',
            'change select[name="FieldWorker"]': 'checkUsers',
        },

        name: 'Station creation',

        ui: {
            'staForm': '.js-form',
        },

        initialize: function(options) {
            this.from = options.from;
            this.histoMonitoredSite = {};
        },

        onShow: function() {
            this.refrechView('#stWithCoords');
            this.displayMap();
            this.$el.i18n();
        },

        displayMap: function() {
            var self = this;
            this.map = new NsMap({
                popup: true,
                zoom: 2,
                element: 'map',
                drawable: true,
                drawOptions: {
                    circle: false,
                    rectangle: false,
                    polyline: false,
                    polygon: false,
                    circlemarker: false
                }
            });
            //center map on France
            this.map.map.fitBounds([
                [41.959891, -4.077587],
                [51.276321, 8.698981]
            ])

            this.map.map.on('draw:created', function(e) {
                var type = e.layerType;
                self.currentLayer = e.layer;
                self.map.drawnItems.addLayer(self.currentLayer);
                var latlon = self.currentLayer.getLatLng();
                self.setLatLonForm(latlon.lat, latlon.lng);
                self.map.toggleDrawing();
            });

            this.map.map.on('draw:edited', function(e) {
                var latlon = self.currentLayer.getLatLng();
                self.setLatLonForm(latlon.lat, latlon.lng);
            });

            this.map.map.on('draw:deleted', function() {
                self.removeLatLngMakrer(true);
            });
        },

        removeLatLngMakrer: function(reInitLatLng) {
            if (this.currentLayer) {
                this.map.drawnItems.removeLayer(this.currentLayer);
                this.currentLayer = null;
            }
            if (reInitLatLng) {
                this.$el.find('input[name="LAT"]').val('');
                this.$el.find('input[name="LON"]').val('');
            }
            this.map.toggleDrawing();
        },

        setLatLonForm: function(lat, lon) {
            var lat = this.$el.find('input[name="LAT"]').val(parseFloat(lat.toFixed(5)));
            var lon = this.$el.find('input[name="LON"]').val(parseFloat(lon.toFixed(5)));
        },

        getLatLng: function() {
            var lat = this.$el.find('input[name="LAT"]').val();
            var lon = this.$el.find('input[name="LON"]').val();
            this.updateMarkerPos(lat, lon);
        },

        updateMarkerPos: function(lat, lon) {
            if (lat && lon) {
                // this.map.toggleDrawing(true);
                if (this.currentLayer) {
                    this.currentLayer.setLatLng(new L.LatLng(lat, lon));
                } else {
                    this.currentLayer = new L.marker(new L.LatLng(lat, lon));
                    this.map.drawnItems.addLayer(this.currentLayer)
                }

                var center = this.currentLayer.getLatLng();
                this.map.map.panTo(center, { animate: false });
            } else {
                this.removeLatLngMakrer();
            }
        },

        onDestroy: function() {
            this.map.destroy();
            this.nsForm.destroy();
        },

        getCurrentPosition: function() {
            var _this = this;
            if (navigator.geolocation) {
                var loc = navigator.geolocation.getCurrentPosition(function(position) {
                    var lat = parseFloat((position.coords.latitude).toFixed(5));
                    var lon = parseFloat((position.coords.longitude).toFixed(5));
                    _this.updateMarkerPos(lat, lon);
                    _this.$el.find('input[name="LAT"]').val(lat).change();
                    _this.$el.find('input[name="LON"]').val(lon).change();
                });
            } else {
                Swal({
                    title: 'The browser dont support geolocalization API',
                    text: '',
                    type: 'error',
                    showCancelButton: false,
                    confirmButtonColor: 'rgb(147, 14, 14)',
                    confirmButtonText: 'OK',
                    closeOnConfirm: true,
                });
            }
        },

        getLatLng: function() {
            var lat = this.$el.find('input[name="LAT"]').val();
            var lon = this.$el.find('input[name="LON"]').val();
            this.updateMarkerPos(lat, lon);
        },

        checkUsers: function(e) {
            var usersFields = $('select[name="FieldWorker"]');
            var selectedUser = $(e.target).val();
            var exists = 0;
            $('select[name="FieldWorker"]').each(function() {
                var user = $(this).val();
                if (user == selectedUser) {
                    exists += 1;
                }
            });
            if (exists > 1) {
                Swal({
                        title: 'Fieldworker name error',
                        text: 'Already selected ! ',
                        type: 'error',
                        showCancelButton: false,
                        confirmButtonColor: 'rgb(147, 14, 14)',
                        confirmButtonText: 'OK',
                        closeOnConfirm: true,
                    },
                    function(isConfirm) {
                        $(e.target).val('');
                    });
            }
        },

        displayTab: function(e) {
            var _this = this;
            e.preventDefault();
            window.checkExitForm(function() {
                _this.swithTab(e);
            });

        },
        swithTab: function(e) {
            var ele = $(e.target);
            var tabLink = $(ele).attr('href');
            $('.tab-ele').removeClass('active');
            $(ele).parent().addClass('active');
            $(tabLink).addClass('active in');
            this.refrechView(tabLink);
        },

        refrechView: function(stationType) {
            var stTypeId;
            var _this = this;
            switch (stationType) {
                case '#stWithCoords':
                    stTypeId = 1;
                    $('.js-get-current-position').removeClass('hidden');
                    break;
                case '#stWithoutCoords':
                    stTypeId = 3;
                    $('.js-get-current-position').addClass('hidden');
                    break;
                default:
                    break;
            }

            if (this.nsForm) {
                this.nsForm.destroy();
            }

            this.ui.staForm.empty();

            this.nsForm = new NsForm({
                name: 'StaForm',
                modelurl: 'stations/',
                buttonRegion: [],
                formRegion: this.ui.staForm,
                displayMode: 'edit',
                objectType: stTypeId,
                id: 0,
                afterShow: function() {
                    if (_this.from == 'release') {
                        _this.$el.find('[name="fieldActivityId"]').val('1').change();
                    }
                    _this.$el.find('input[name="FK_MonitoredSite"]').on('change', function() {
                        var msId = _this.$el.find('input[name="FK_MonitoredSite"]').attr('data_value');
                        _this.getCoordFromMs(msId);
                    });
                }
            });

            this.nsForm.savingSuccess = function(model, resp) {
                _this.afterSave(model, resp);
            };

            this.rdy = this.nsForm.jqxhr;
        },

        getCoordFromMs: function(msId) {
            var _this = this;
            var url = 'monitoredSites/' + msId;

            $.ajax({
                context: this,
                url: url,
            }).done(function(data) {
                _this.$el.find('input[name="LAT"]').val(data['LAT']).change();
                _this.$el.find('input[name="LON"]').val(data['LON']).change();
                _this.$el.find('input[name="ELE"]').val(data['ELE']).change();
                _this.$el.find('input[name="precision"]').val(data['Precision']).change();
                _this.$el.find('input[name="Place"]').val(data['Place']).change();
                _this.$el.find('select[name="FK_Region"]').val(data['FK_Region']).change();
            }).fail(function() {
                console.error('an error occured');
            });
        },

        afterSave: function(model, resp) {
            var id = model.get('ID');
            if (this.from == 'release') {
                Backbone.history.navigate('#release/' + id, { trigger: true });
                return;
            } else {
                Backbone.history.navigate('#stations/' + id, { trigger: true });
            }
        },

        save: function() {
            this.nsForm.butClickSave();
        }

    });
});