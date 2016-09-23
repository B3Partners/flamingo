/*
 * Copyright (C) 2012-2016 B3Partners B.V.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

Ext.define('Ext.ux.b3p.CrudGrid', {

    requires: [
        'Ext.grid.*',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.ux.grid.GridHeaderFilters',
        'Ext.toolbar.Paging'
    ],

    config: {
        gridurl: "",
        itemname: ""
    },

    grid: null,
    store: null,

    constructor: function() {
        this.store = this.createStore();
        this.grid = this.createGrid();
    },

    /**
     * Get the grid
     * @returns {Ext.grid.Panel}
     */
    getGrid: function() {
        return this.grid;
    },

    /**
     * Get the grid
     * @returns {Ext.data.Store}
     */
    getStore: function() {
        return this.store;
    },

    /**
     * Get the columns for the grid
     */
    getGridColumns: function() {
        throw "getGridColumns function should be defined in child class";
    },

    /**
     * Get the array with fields for the grid model
     */
    getGridModel: function() {
        throw "getGridModel function should be defined in child class";
    },

    /**
     * Get the URL to remove an item
     */
    getRemoveUrl: function(record) {
        throw "getRemoveUrl function should be defined in child class";
    },

    /**
     * Get the URL to edit an item
     */
    getEditUrl: function(record) {
        throw "getEditUrl function should be defined in child class";
    },

    /**
     * Get the additional options for the grid (like columns, extra listeners, etc)
     * @returns {{}}
     */
    getGridOptions: function() {
        return {};
    },

    /**
     * Get the extra params for store
     * @returns {{}}
     */
    getStoreExtraParams: function() {
        return {};
    },

    /**
     * Get datastore for grid
     * @returns {Ext.data.Store}
     */
    createStore: function() {
        Ext.define('TableRow', {
            extend: 'Ext.data.Model',
            fields: this.getGridModel()
        });
        return Ext.create('Ext.data.Store', {
            pageSize: 10,
            model: 'TableRow',
            remoteSort: true,
            remoteFilter: true,
            sorters: 'name',
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: this.config.gridurl,
                extraParams: this.getStoreExtraParams(),
                reader: {
                    type: 'json',
                    root: 'gridrows',
                    totalProperty: 'totalCount'
                },
                simpleSortMode: true
            },
            listeners: {
                load: {
                    fn: function () {
                        this.grid.updateLayout(); // Fix to apply filters
                    },
                    scope: this
                }
            }
        });
    },

    createGrid: function() {
        var gridOptions = this.getGridOptions();
        return Ext.create('Ext.grid.Panel', Ext.merge(vieweradmin.components.DefaultConfgurations.getDefaultGridConfig(), {
            itemId: 'editGrid',
            store: this.getStore(),
            columns: this.getGridColumns(),
            listeners: {
                cellclick: {
                    fn: function (grid, td, cellIndex, record, tr, rowIndex, e) {
                        var target = e.getTarget();
                        if (!target || !target.className) {
                            return;
                        }
                        if (target.className.indexOf("editobject") !== -1) {
                            e.preventDefault();
                            this.editObject(record);
                        }
                        if (target.className.indexOf("removeobject") !== -1) {
                            e.preventDefault();
                            this.removeObject(record);
                        }
                        if(this.cellClickListener) {
                            this.cellClickListener(e, target, record);
                        }
                    },
                    scope: this
                }
            },
            bbar: Ext.create('Ext.PagingToolbar', {
                store: this.getStore(),
                displayInfo: true,
                displayMsg: [ this.capitalize(this.config.itemname), " {0} - {1} of {2}"].join(""),
                emptyMsg: ["Geen ", this.config.itemname, " weer te geven"].join("")
            }),
            plugins: [
                Ext.create('Ext.ux.grid.GridHeaderFilters', {
                    enableTooltip: false
                })
            ],
            renderTo: 'grid-container'
        }, gridOptions));
    },

    editObject: function(record) {
        Ext.get('editFrame').dom.src = this.getEditUrl(record);
        this.grid.getSelectionModel().select(record);
        return false;
    },

    removeObject: function(record) {
        Ext.MessageBox.show({
            title: "Bevestiging",
            msg: this.removeConfirmMessage(record),
            buttons: Ext.MessageBox.OKCANCEL,
            fn: function(btn){
                if(btn === 'ok') {
                    Ext.get('editFrame').dom.src = this.getRemoveUrl(record);
                    this.grid.getSelectionModel().select(record);
                }
            },
            scope: this
        });
        return false;
    },

    removeConfirmMessage: function(record) {
        return "Weet u zeker dat u dit item wilt verwijderen?";
    },

    reloadGrid: function(){
        this.getStore().load();
    },

    capitalize: function(str) {
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    },

    createUrl: function(base, params) {
        var url = base || "";
        if(url.indexOf("?") !== -1) {
            url += "&";
        } else {
            url += "?";
        }
        var parameters = [];
        for(var paramname in params) if(params.hasOwnProperty(paramname)) {
            parameters.push([paramname, "=", params[paramname]].join(""));
        }
        return url + parameters.join("&");
    },

    removeActiveAppMenu: function() {
        var a = document.getElementById("activeAppMenu");
        if(a) {
            Ext.removeNode(a);
        }
    }

});