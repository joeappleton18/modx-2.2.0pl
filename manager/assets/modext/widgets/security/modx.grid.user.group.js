/**
 * Loads a grid of groups for a user
 * 
 * @class MODx.grid.UserGroups
 * @extends MODx.grid.Grid
 * @param {Object} config An object of options.
 * @xtype modx-grid-user-groups
 */
MODx.grid.UserGroups = function(config) {
    config = config || {};
    Ext.applyIf(config,{
        title: ''
        ,id: 'modx-grid-user-groups'
        ,url: MODx.config.connectors_url+'security/group.php'
        ,fields: ['usergroup','name','member','role','rolename','primary_group','rank']
        ,cls: 'modx-grid modx-grid-draggable'
        ,columns: [{
            header: _('user_group')
            ,dataIndex: 'name'
            ,width: 175
        },{
            header: _('role')
            ,dataIndex: 'rolename'
            ,width: 175
        },{
            header: _('rank')
            ,dataIndex: 'rank'
            ,width: 80
            ,editor: { xtype: 'numberfield', allowBlank: false, allowNegative: false }
        }]
        ,plugins: [new Ext.ux.dd.GridDragDropRowOrder({
            copy: false
            ,scrollable: true
            ,targetCfg: {}
            ,listeners: {
                'afterrowmove': {fn:this.onAfterRowMove,scope:this}
            }
        })]
        ,tbar: [{
            text: _('user_group_user_add')
            ,handler: this.addGroup
        }]
    });
    MODx.grid.UserGroups.superclass.constructor.call(this,config);
    this.userRecord = new Ext.data.Record.create(['usergroup','name','member','role','rolename','primary_group']);
    this.addEvents('beforeUpdateRole','afterUpdateRole','beforeAddGroup','afterAddGroup');
};
Ext.extend(MODx.grid.UserGroups,MODx.grid.LocalGrid,{

    onAfterRowMove: function(dt,sri,ri,sels) {
        var s = this.getStore();
        var sourceRec = s.getAt(sri);
        var belowRec = s.getAt(ri);
        var total = s.getTotalCount();

        sourceRec.set('rank',sri);
        sourceRec.commit();

        /* get all rows below ri, and up their rank by 1 */
        var brec;
        for (var x=(ri-1);x<total;x++) {
            brec = s.getAt(x);
            if (brec) {
                brec.set('rank',x);
                brec.commit();
            }
        }
        return true;
    }
    ,updateRole: function(btn,e) {
        var r = this.menu.record;
        r.user = this.config.user;
        this.fireEvent('beforeUpdateRole',r);
        
        this.loadWindow(btn,e,{
            xtype: 'modx-window-user-groups-role-update'
            ,record: r
            ,listeners: {
                'success': {fn:function(r) {
                    var s = this.getStore();
                    var rec = s.getAt(this.menu.recordIndex);
                    rec.set('role',r.role);
                    rec.set('rolename',r.rolename);
                    
                    this.fireEvent('afterUpdateRole',r);
                },scope:this}
            }
        });
    }
    ,addGroup: function(btn,e) {
        var r = {member:this.config.user};
        this.fireEvent('beforeUpdateRole',r);
        this.loadWindow(btn,e,{
            xtype: 'modx-window-user-addgroup'
            ,record: r
            ,listeners: {
                'success': {fn:function(r) {
                    var s = this.getStore();
                    var rec = new this.userRecord(r);
                    s.add(rec);
                    
                    this.fireEvent('afterAddGroup',r);
                },scope:this}
            }
        });
    }
    
    ,_showMenu: function(g,ri,e) {
        e.stopEvent();
        e.preventDefault();
        var m = this.menu;
        m.recordIndex = ri;
        m.record = this.getStore().getAt(ri).data;
        if (!this.getSelectionModel().isSelected(ri)) {
            this.getSelectionModel().selectRow(ri);
        }
        m.removeAll();
        m.add({
            text: _('user_role_update')
            ,handler: this.updateRole
            ,scope: this
        },'-',{
            text: _('user_group_user_remove')
            ,handler: this.remove.createDelegate(this,[{text: _('user_group_remove_confirm')}])
            ,scope: this
        });
        m.show(e.target);
    }
});
Ext.reg('modx-grid-user-groups',MODx.grid.UserGroups);



MODx.window.AddGroupToUser = function(config) {
    config = config || {};
    Ext.applyIf(config,{
        title: _('user_group_user_add')
        ,height: 150
        ,width: 375
        ,url: MODx.config.connectors_url+'security/user/group.php'
        ,action: 'create'
        ,fields: [{
            fieldLabel: _('user_group')
            ,name: 'usergroup'
            ,hiddenName: 'usergroup'
            ,id: 'modx-agu-usergroup'
            ,xtype: 'modx-combo-usergroup'
            ,editable: false
            ,allowBlank: false
            ,anchor: '90%'
        },{
            fieldLabel: _('role')
            ,name: 'role'
            ,hiddenName: 'role'
            ,id: 'modx-agu-role'
            ,xtype: 'modx-combo-role'
            ,allowBlank: false
            ,anchor: '90%'
        },{
            name: 'member'
            ,xtype: 'hidden'
        }]
    });
    MODx.window.AddGroupToUser.superclass.constructor.call(this,config);
};
Ext.extend(MODx.window.AddGroupToUser,MODx.Window,{
    submit: function() {
        var r = this.fp.getForm().getValues();
        
        var g = Ext.getCmp('modx-grid-user-groups');
        var s = g.getStore();
        var v = s.query('usergroup',r.usergroup).items;
        if (v.length > 0) {
            MODx.msg.alert(_('error'),_('user_err_ae_group'));
            return false;
        }
        
        r.rolename = Ext.getCmp('modx-agu-role').getRawValue();
        r.name = Ext.getCmp('modx-agu-usergroup').getRawValue();
        this.fireEvent('success',r);
        this.hide();
        return false;
    }
});
Ext.reg('modx-window-user-addgroup',MODx.window.AddGroupToUser);



MODx.window.UpdateUserGroupsRole = function(config) {
    config = config || {};
    Ext.applyIf(config,{
        id: 'modx-window-user-groups-role-update'
        ,title: _('user_group_user_update_role')
        ,url: MODx.config.connectors_url+'security/user.php'
        ,action: 'updateRole'
        ,fields: [{
            xtype: 'hidden'
            ,name: 'user'
            ,value: config.user
        },{
            xtype: 'modx-combo-role'
            ,id: 'modx-uugrs-role'
            ,name: 'role'
            ,fieldLabel: _('role')
            ,anchor: '90%'
        }]
    });
    MODx.window.UpdateUserGroupsRole.superclass.constructor.call(this,config);
};
Ext.extend(MODx.window.UpdateUserGroupsRole,MODx.Window,{
    submit: function() {
        var r = this.fp.getForm().getValues();
        r.rolename = Ext.getCmp('modx-uugrs-role').getRawValue();
        this.fireEvent('success',r);
        this.hide();
        return false;
    }
});
Ext.reg('modx-window-user-groups-role-update',MODx.window.UpdateUserGroupsRole);