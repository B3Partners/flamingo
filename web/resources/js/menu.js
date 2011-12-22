/* 
 * Copyright (C) 2011 B3Partners B.V.
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

Ext.onReady(function() {
    Ext.select('.menu-level1').on('click', function(e, el, o) {
        Ext.select('.menu-level1').removeCls('menuclicked');
        Ext.get(this).addCls('menuclicked');
    });
    // Active link should be set somewhere, better ideas to do this?
    if(typeof activelink !== 'undefined') {
        if(activelink != '') {
            var menuItem = Ext.get(activelink);
            menuItem.addCls('active');
            menuItem.findParent('.menu-level1', 10, true).addCls('menuclicked');
        }
    }
});