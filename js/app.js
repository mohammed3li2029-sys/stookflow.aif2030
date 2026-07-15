/* ===================================================================
   BACKEND SYNC HELPER (Supabase)
   Wraps an array in a Proxy so that any push/splice/unshift/index
   assignment is automatically mirrored to the database (when configured).
   In demo mode (no Supabase config) this is a harmless no-op and the
   array behaves exactly like a normal array.
=================================================================== */
function withFirestoreSync(arr, collectionName, idField){
  return new Proxy(arr, {
    set(target, prop, value){
      target[prop] = value;
      if(window.StockFlowBackend && window.StockFlowBackend.enabled && prop !== 'length'){
        window.StockFlowBackend.syncCollection(collectionName, target, idField);
      }
      return true;
    },
    deleteProperty(target, prop){
      delete target[prop];
      if(window.StockFlowBackend && window.StockFlowBackend.enabled){
        window.StockFlowBackend.syncCollection(collectionName, target, idField);
      }
      return true;
    }
  });
}

/* Once the backend reports its status, try loading Inventory & Warehouses
   from Supabase. If the tables are empty/unavailable, the built-in demo
   data (already on screen) is left untouched — so the app always works,
   with or without Supabase configured. */
window.addEventListener('stockflow-backend-ready', async ()=>{
  if(!window.StockFlowBackend || !window.StockFlowBackend.enabled) return;
  try{
    const inv = await window.StockFlowBackend.loadCollection('inventory');
    if(inv && inv.length){ inventoryData.length = 0; inv.forEach(item => inventoryData.push(item)); }

    const wh = await window.StockFlowBackend.loadCollection('warehouses');
    if(wh && wh.length){ warehouseData.length = 0; wh.forEach(item => warehouseData.push(item)); }

    const reqs = await window.StockFlowBackend.loadCollection('material_requests');
    if(reqs && reqs.length){ reqsData.length = 0; reqs.forEach(item => reqsData.push(item)); }

    const projs = await window.StockFlowBackend.loadCollection('projects');
    if(projs && projs.length){ projects.length = 0; projs.forEach(item => projects.push(item)); }

    const quotes = await window.StockFlowBackend.loadCollection('quotations');
    if(quotes && quotes.length){ quotations.length = 0; quotes.forEach(item => quotations.push(item)); }

    const pos = await window.StockFlowBackend.loadCollection('purchase_orders');
    if(pos && pos.length){ purchaseOrders.length = 0; pos.forEach(item => purchaseOrders.push(item)); }

    const profiles = await window.StockFlowBackend.loadCollection('profile');
    if(profiles && profiles.length){
      Object.assign(profileData, profiles[0]);
      if(typeof refreshTopbarProfile === 'function') refreshTopbarProfile();
    }

    const users = await window.StockFlowBackend.loadCollection('users');
    if(users && users.length){
      usersData.length = 0;
      // Password isn't stored server-side (see syncUsers()); restore with
      // a local placeholder so the edit form still has a value to show.
      users.forEach(u => usersData.push({...u, password: encodePW('')}));
      if(typeof syncLoginUsers === 'function') syncLoginUsers();
    }

    // Re-render whichever page is currently on screen so freshly-loaded
    // data (inventory, warehouses, requests, projects, quotations, POs)
    // is reflected immediately, regardless of load timing.
    if(typeof navigate === 'function' && typeof currentPage !== 'undefined'){
      navigate(currentPage);
    }
  }catch(err){
    console.error('[StockFlow] Supabase initial load failed:', err);
  }
});


/* ===================================================================
   ICONS
=================================================================== */
const ICONS = {
  dashboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/></svg>',
  inventory:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>',
  warehouse:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9.5 12 4l9 5.5V20a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/></svg>',
  sales:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>',
  purchase:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.5 3h2l2.7 12.4a2 2 0 0 0 2 1.6h8.1a2 2 0 0 0 2-1.6L21 7H6"/></svg>',
  issue:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/><path d="m9 15 2 2 4-4"/></svg>',
  movements:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7"/></svg>',
  reports:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 16v-4M12 16V8M17 16v-7"/></svg>',
  projects:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/><rect x="8" y="8" width="8" height="8" rx="1"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  notifications:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>',
  settings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.13.36.43.65.8.8.13.05.27.09.41.09H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>',
  box:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>',
  dollar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  flag:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22V4a1 1 0 0 1 1.4-.9L18 8l-12.6 5L4 22Z"/></svg>',
  calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  plusCircle:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>',
  x:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  truckIn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="6" width="13" height="10" rx="1"/><path d="M14 9h4l4 4v3h-8z"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>',
  truckOut:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="6" width="13" height="10" rx="1"/><path d="M14 9h4l4 4v3h-8z"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="19" r="2"/></svg>',
  move:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 7 12 2 3 7l9 5 9-5Z"/><path d="m3 12 9 5 9-5M3 17l9 5 9-5"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  filter:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3Z"/></svg>',
  download:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
  eye:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>',
  edit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>',
  trash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"/></svg>',
  drill:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 17 12 7l2 2-10 10z"/><path d="m14 5 3-3 4 4-3 3M16 16l4 4"/></svg>',
  inbox:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
  chevronUp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>',
  chevronDown:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>',
};
const RYAL = '<svg viewBox="0 0 204 192" width="1em" height="0.94em" style="vertical-align:-0.15em;display:inline-block;"><g transform="translate(0,192) scale(0.1,-0.1)" fill="currentColor"><path d="M864 1789 c-21 -16 -48 -45 -60 -62 -22 -32 -22 -39 -28 -507 -3 -261 -6 -487 -6 -501 0 -32 12 -28 -235 -79 -104 -22 -196 -47 -204 -54 -22 -22 -51 -150 -35 -154 24 -6 449 85 486 104 32 16 100 99 129 155 18 36 19 65 19 584 0 453 -2 545 -14 545 -7 0 -31 -14 -52 -31z"/><path d="M1205 1752 c-16 -11 -47 -38 -67 -60 l-38 -42 0 -245 c0 -164 3 -245 10 -245 6 0 40 7 75 16 l65 16 0 289 c0 159 -3 289 -7 289 -5 0 -21 -8 -38 -18z"/><path d="M1610 1238 c-25 -5 -171 -36 -325 -69 -154 -32 -290 -61 -302 -64 -22 -5 -23 -11 -23 -86 0 -72 2 -80 18 -75 9 2 62 14 117 25 89 18 326 69 472 101 44 10 54 16 68 46 14 31 33 136 24 133 -2 -1 -24 -5 -49 -11z"/><path d="M555 1017 c-139 -32 -140 -32 -157 -68 -25 -50 -35 -129 -17 -129 8 0 90 16 182 35 93 19 173 35 178 35 5 0 9 36 9 80 l0 80 -27 -1 c-16 0 -91 -15 -168 -32z"/><path d="M1195 963 c-11 -2 -37 -9 -57 -14 l-38 -10 0 -134 c0 -122 2 -135 18 -135 9 0 71 12 137 25 66 14 165 35 220 47 139 29 141 29 158 85 17 54 29 113 22 113 -2 0 -82 -16 -177 -36 -95 -20 -185 -39 -200 -42 -28 -4 -28 -4 -28 52 0 59 -2 61 -55 49z"/><path d="M1545 565 c-55 -12 -161 -35 -235 -50 -74 -15 -143 -32 -153 -37 -10 -5 -25 -24 -32 -41 -13 -31 -31 -127 -24 -127 2 1 116 25 254 54 242 51 250 53 267 82 18 31 39 132 29 138 -3 1 -51 -7 -106 -19z"/></g></svg>';
const spanBig = s => '<span style="font-size:1.25em;display:inline-block;">'+s+'</span>';
// DEMO NOTICE: Password encoding is basic (btoa) for prototype purposes only.
// In production, use a backend with proper bcrypt/Argon2 hashing
// and HTTPS for all authentication.
function encodePW(pw){ return btoa(pw); }
/* ===================================================================
   FACTORY LOGO (SVG)
=================================================================== */
const FACTORY_LOGO = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="16" fill="#0A66FF"/><text x="50" y="38" text-anchor="middle" fill="white" font-size="11" font-weight="bold" font-family="Arial">STOCK</text><text x="50" y="55" text-anchor="middle" fill="white" font-size="11" font-weight="bold" font-family="Arial">FLOW</text><rect x="22" y="62" width="56" height="6" rx="3" fill="rgba(255,255,255,.3)"/><rect x="30" y="72" width="40" height="6" rx="3" fill="rgba(255,255,255,.2)"/></svg>');

/* ===================================================================
   I18N
=================================================================== */
const STR = {
en:{
  brand:{tagline:'Smart Warehouse & Inventory'},
  nav:{dashboard:'Dashboard',inventory:'Inventory',warehouses:'Warehouses',sales:'Sales',purchasing:'Purchasing',issues:'Issue & Consumption',movements:'Stock Movements',reports:'Reports & Analytics',users:'User Management',notifications:'Notifications',settings:'Settings',help:'Help',logout:'Logout'},
  topbar:{search:'Search items, suppliers, orders...',role:'Administrator'},
  page:{
    dashboard:['Dashboard','Real-time overview of your warehouse'],
    sales:['Sales & Quotations','Create and manage customer quotes'],
    inventory:['Inventory Management','Add, edit and track every item'],
    warehouses:['Warehouse Management','Locations, sections & transfers'],
    purchasing:['Purchasing','Suppliers, orders & receiving'],
    issues:['Issue & Consumption','Material requests & approvals'],
    movements:['Stock Movements','Inbound, outbound & transfers'],
    reports:['Reports & Analytics','Insight into stock performance'],
    projects:['Projects Management','Track all project phases from contract to delivery'],
    users:['User Management','Roles, access & activity logs'],
    notifications:['Notifications','Alerts and system messages'],
    settings:['Settings','Preferences & system configuration'],
  },
  kpi:{totalItems:'Total Items',invValue:'Inventory Value',lowStock:'Low Stock Items',activeOrders:'Active Orders'},
  dist:{title:'Stock Distribution',raw:'Raw Materials',wip:'WIP',finished:'Finished Goods'},
  weekly:{title:'Weekly Movement',inbound:'Inbound',outbound:'Outbound'},
  lowAlerts:{title:'Low Stock Alerts',orderNow:'Order Now',critical:'CRITICAL',low:'LOW'},
  activity:{title:'Recent Warehouse Activity',received:'Received',shipped:'Shipped',moved:'Moved',ago:'ago'},
  toolbar:{addItem:'Add New Item',filter:'Filter',export:'Export',search:'Search items by name, SKU, category...',filterStatus:'Status',filterCat:'Category',filterAll:'All',applyFilter:'Apply',resetFilter:'Reset'},
  table:{item:'Item',sku:'SKU / ID',category:'Category',stock:'Stock',location:'Location',status:'Status',actions:'Actions',inStock:'In Stock',lowStock:'Low Stock',critical:'Critical'},
  wh:{occupancy:'Occupancy',items:'Items',sections:'Sections',transfer:'Transfer Stock',addWarehouse:'Add Warehouse',editWarehouse:'Edit Warehouse',whNameEn:'Warehouse Name (EN)',whNameAr:'Warehouse Name (AR)',capacity:'Capacity (items)',current:'Current Items',whSaved:'Warehouse saved successfully',deleteWh:'Delete Warehouse',deleteWhTitle:'Delete this warehouse?',deleteWhBody:'This will permanently remove "{name}" from the system.',transferTitle:'Transfer Stock Between Warehouses',transferFrom:'From Warehouse',transferTo:'To Warehouse',transferItem:'Item',transferQty:'Quantity',transferNote:'Notes (optional)',transferSubmit:'Execute Transfer',transferDone:'Stock transfer completed successfully',transferErr:'Please fill all required fields'},
  modal:{addItem:'Add New Item',editItem:'Edit Item',viewItem:'Item Details',itemName:'Item Name',sku:'SKU',category:'Category',unit:'Unit',qty:'Stock Qty',minLevel:'Min Stock Level',location:'Warehouse / Location',cancel:'Cancel',save:'Save Item',saveChanges:'Save Changes',close:'Close',delete:'Delete',deleteTitle:'Delete this item?',deleteBody:'This will permanently remove "{name}" from inventory. This can\'t be undone.',deletedToast:'Item deleted',uploadImage:'Upload Image',removeImage:'Remove Image',image:'Item Image'},
  purchasing:{newPO:'New Purchase Order',suppliers:'Active Suppliers',openPOs:'Open Purchase Orders',avgDelivery:'Avg. Delivery Time',supplierPerf:'Supplier Performance',poList:'Recent Purchase Orders',supplier:'Supplier',deliveryDate:'Expected Delivery Date',item:'Item',qty:'Quantity',unitPrice:'Unit Price (SAR)',notes:'Notes',total:'Total Amount',submitOrder:'Submit Order',orderAdded:'Purchase order submitted successfully'},
  issues:{newRequest:'New Material Request',pending:'Pending Approval',approvedToday:'Approved Today',departments:'Departments Served',list:'Recent Issue Requests',department:'Department',priority:'Priority',priorityNormal:'Normal',priorityUrgent:'Urgent',priorityCritical:'Critical',requiredQty:'Required Quantity',requiredDate:'Required Date',reason:'Reason / Purpose',submitRequest:'Submit Request',requestAdded:'Material request submitted successfully'},
  movements:{title:'Movement Log',inbound:'Inbound',outbound:'Outbound',transfer:'Transfer'},
  reports:{slow:'Slow-Moving Items',fast:'Fast-Moving Items',purchases:'Purchases Report',disbursement:'Disbursement by Project',suppliers:'Suppliers Report',inventory:'Inventory Report',stock:'Current Stock Report',valuation:'Inventory Valuation',utilization:'Warehouse Utilization',exportExcel:'Export to Excel',exportPdf:'Export PDF',print:'Print',applyFilter:'Apply',resetFilter:'Reset',fromDate:'From Date',toDate:'To Date',colItem:'Item',colSku:'SKU',colStock:'Stock',colMin:'Min Level',colLocation:'Location',colStatus:'Status',colMovement:'Last Movement',colMovements:'Movements',colSupplier:'Supplier',colOrders:'Orders',colTotal:'Total (SAR)',colDate:'Date',colDepartment:'Department',colQty:'Qty',colPriority:'Priority',colDelivery:'Delivery (days)',colQuality:'Quality (%)',colSpend:'Total Spend (SAR)',colValue:'Est. Value (SAR)',noData:'No data matches the selected period'},
  users:{addUser:'Add User',role:'Role',lastActive:'Last Active',admin:'Administrator',manager:'Warehouse Manager',supervisor:'Supervisor',employee:'Employee'},
  notif:{markAll:'Mark all as read',lowStockMsg:'fell below minimum stock level',expiryMsg:'is approaching its expiry date',approvalMsg:'is waiting for your approval',systemMsg:'Scheduled maintenance completed successfully',todayTitle:'Today',upcomingTitle:'Upcoming'},
  calendar:{title:'Calendar',btnAdd:'Add Event',btnCancel:'Cancel',eventName:'Event Name',eventDate:'Date',eventTime:'Time',addTitle:'New Event',noEvents:'No events',today:'Today',monthNames:['January','February','March','April','May','June','July','August','September','October','November','December'],dayNames:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],eventNotifPrefix:'Upcoming event',todayEvents:'events today'},
  settings:{
    appearance:'Appearance',darkMode:'Dark Mode',darkModeSub:'Switch between light and dark interface',language:'Language & Region',langSub:'Interface language and text direction',notifGroup:'Notifications',lowStockAlerts:'Low Stock Alerts',lowStockSub:'Notify when items fall below minimum level',expiryAlerts:'Expiry Alerts',expirySub:'Notify before items reach expiry date',approvalNotif:'Approval Requests',approvalSub:'Notify on pending approval workflow items',system:'System',backup:'Backup & Restore',backupSub:'Automatic daily backup of local database',offline:'Offline Mode',offlineSub:'Continue working without an internet connection',light:'Light',dark:'Dark',auto:'Auto'
  },
  projects:{list:'Projects List',dashboard:'Projects Dashboard',plan:'Automation Plan',newProject:'New Project',editProject:'Edit Project',deleteProject:'Delete Project',deleteConfirm:'Are you sure you want to delete this project?',projectName:'Project Name',projectNumber:'Project #',client:'Client',type:'Type',location:'Location',manager:'Project Manager',contractValue:'Contract Value',contractDate:'Contract Date',startDate:'Start Date',duration:'Duration (days)',endDate:'Expected End Date',progress:'Progress',status:'Status',priority:'Priority',contractNo:'Contract No.',contractFile:'Contract (PDF)',coordinates:'Coordinates',engineer:'Responsible Engineer',notes:'Notes',phases:'Phases',materials:'Materials',purchases:'Purchases',team:'Team',documents:'Documents',gallery:'Gallery',activityLog:'Activity Log',risks:'Risks',alerts:'Alerts',addMaterial:'Add Material',editMaterial:'Edit Material',importExcel:'Import from Excel',importBOM:'Import BOM',materialName:'Material Name',qtyRequired:'Qty Required',qtyIssued:'Qty Issued',qtyRemaining:'Qty Remaining',qtyAvailable:'Available in Stock',materialStatus:'Status',statusProvided:'Provided',statusOrdered:'On Order',statusNotAvailable:'Not Available',issueDate:'Issue Date',issueRef:'Issue Ref',receivedBy:'Received By',issuedBy:'Issued By',poNumber:'PO #',supplier:'Supplier',orderValue:'Order Value',orderDate:'Order Date',deliveryDate:'Delivery Date',orderStatus:'Order Status',teamMember:'Team Member',role:'Role',addMember:'Add Member',documentName:'Document Name',docType:'Document Type',uploadDate:'Upload Date',addDocument:'Add Document',imageCategory:'Image Category',beforeExec:'Before Execution',duringExec:'During Execution',afterExec:'After Execution',addImage:'Add Image',logEntry:'Log Entry',addNote:'Add Note',riskName:'Risk',riskLevel:'Risk Level',addRisk:'Add Risk',activeProjects:'Active Projects',completedProjects:'Completed Projects',overdueProjects:'Overdue Projects',totalProjectsValue:'Total Projects Value',upcomingDeadlines:'Upcoming Deadlines',overdueList:'Overdue Projects',mostUsedMaterials:'Most Used Materials',topProgress:'Top Progress',daysRemaining:'days remaining',phase:'Phase',startDatePhase:'Start Date',endDatePhase:'End Date',responsible:'Responsible',phaseStatus:'Phase Status',phaseNotStarted:'Not Started',phaseInProgress:'In Progress',phaseCompleted:'Completed',phaseDelayed:'Delayed',alertNearDeadline:'Project deadline approaching',alertOverdue:'Project is overdue',alertMaterialShortage:'Material shortage',alertContractEnding:'Contract ending soon',alertMaterialArrived:'Materials arrived',alertSupplierDelay:'Supplier delay',searchProjects:'Search by name, client or number...',allStatus:'All Statuses',allPriority:'All Priorities',filter:'Filter',export:'Export',exportExcel:'Export to Excel',overall:'Overall Completion',totalMaterials:'Total Materials',provided:'Provided',onOrder:'Under Order',notAvailable:'Not Available',materialSummary:'Material Summary',issueOrders:'Issue Orders',purchaseOrders:'Purchase Orders',teamMembers:'Team Members',documentsList:'Documents',imageGallery:'Image Gallery',activityHistory:'Activity History',riskRegistry:'Risk Registry',alertsList:'Alerts',noData:'No projects found',noMaterials:'No materials added',noPhases:'No phases defined',noTeam:'No team members',noDocs:'No documents uploaded',noImages:'No images uploaded',noNotes:'No activity recorded',noRisks:'No risks registered',noAlerts:'No alerts',unknown:'Unknown','Phase 1':'Contract Signing','Phase 2':'Plan Approval','Phase 3':'Material Preparation','Phase 4':'Manufacturing','Phase 5':'Painting','Phase 6':'Transport','Phase 7':'Installation','Phase 8':'Preliminary Handover','Phase 9':'Final Handover'},
  units:{days:'days'},
  profile:{title:'Edit Profile',name:'Full Name',role:'Role',email:'Email',changePhoto:'Change Photo',removePhoto:'Remove Photo',saved:'Profile updated successfully'},
},
ar:{
  brand:{tagline:'إدارة المخازن الذكية للمصانع'},
  nav:{dashboard:'لوحة القيادة',inventory:'المخزون',warehouses:'المستودعات',sales:'المبيعات',purchasing:'المشتريات',issues:'الصرف والاستهلاك',movements:'حركة المخزون',reports:'التقارير والتحليلات',projects:'المشاريع',users:'إدارة المستخدمين',notifications:'التنبيهات',settings:'الإعدادات',help:'المساعدة',logout:'تسجيل الخروج'},
  topbar:{search:'ابحث عن منتج، مورد، طلب...',role:'مدير النظام'},
  page:{
    dashboard:['لوحة القيادة','نظرة عامة فورية على المستودع'],
    sales:['المبيعات وعروض الأسعار','إنشاء وإدارة عروض أسعار العملاء'],
    inventory:['إدارة المخزون','إضافة وتعديل ومتابعة كل صنف'],
    warehouses:['إدارة المستودعات','المواقع، الأقسام والتحويلات'],
    purchasing:['المشتريات','الموردون والطلبات والاستلام'],
    issues:['الصرف والاستهلاك','طلبات المواد والموافقات'],
    movements:['حركة المخزون','الوارد والصادر والتحويلات'],
    reports:['التقارير والتحليلات','رؤية أداء المخزون'],
    projects:['إدارة المشاريع','متابعة جميع مراحل المشروع من العقد إلى التسليم'],
    users:['إدارة المستخدمين','الأدوار والصلاحيات وسجل النشاط'],
    notifications:['التنبيهات','تنبيهات ورسائل النظام'],
    settings:['الإعدادات','التفضيلات وإعدادات النظام'],
  },
  kpi:{totalItems:'إجمالي الأصناف',invValue:'قيمة المخزون',lowStock:'أصناف منخفضة المخزون',activeOrders:'الطلبات النشطة'},
  dist:{title:'توزيع المخزون',raw:'مواد خام',wip:'تحت التصنيع',finished:'منتجات تامة'},
  weekly:{title:'الحركة الأسبوعية',inbound:'وارد',outbound:'صادر'},
  lowAlerts:{title:'تنبيهات انخفاض المخزون',orderNow:'اطلب الآن',critical:'حرج',low:'منخفض'},
  activity:{title:'أحدث أنشطة المستودع',received:'تم الاستلام',shipped:'تم الشحن',moved:'تم النقل',ago:'مضت'},
  toolbar:{addItem:'إضافة صنف جديد',filter:'تصفية',export:'تصدير',search:'ابحث بالاسم أو الرمز أو الفئة...',filterStatus:'الحالة',filterCat:'الفئة',filterAll:'الكل',applyFilter:'تطبيق',resetFilter:'إعادة'},
  table:{item:'الصنف',sku:'الرمز',category:'الفئة',stock:'الكمية',location:'الموقع',status:'الحالة',actions:'إجراءات',inStock:'متوفر',lowStock:'منخفض',critical:'حرج'},
  wh:{occupancy:'الإشغال',items:'الأصناف',sections:'الأقسام',transfer:'تحويل المخزون',addWarehouse:'إضافة مستودع',editWarehouse:'تعديل المستودع',whNameEn:'اسم المستودع (EN)',whNameAr:'اسم المستودع (AR)',capacity:'السعة (أصناف)',current:'الأصناف الحالية',whSaved:'تم حفظ المستودع بنجاح',deleteWh:'حذف المستودع',deleteWhTitle:'هل تريد حذف هذا المستودع؟',deleteWhBody:'سيتم حذف "{name}" نهائياً من النظام.',transferTitle:'تحويل المخزون بين المستودعات',transferFrom:'من المستودع',transferTo:'إلى المستودع',transferItem:'الصنف',transferQty:'الكمية',transferNote:'ملاحظات (اختياري)',transferSubmit:'تنفيذ التحويل',transferDone:'تم تنفيذ التحويل بنجاح',transferErr:'يرجى تعبئة جميع الحقول المطلوبة'},
  modal:{addItem:'إضافة صنف جديد',editItem:'تعديل الصنف',viewItem:'تفاصيل الصنف',itemName:'اسم الصنف',sku:'رمز الصنف',category:'الفئة',unit:'الوحدة',qty:'الكمية',minLevel:'الحد الأدنى للمخزون',location:'المستودع / الموقع',cancel:'إلغاء',save:'حفظ الصنف',saveChanges:'حفظ التعديلات',close:'إغلاق',delete:'حذف',deleteTitle:'هل تريد حذف هذا الصنف؟',deleteBody:'سيتم حذف "{name}" نهائيًا من المخزون. لا يمكن التراجع عن هذا الإجراء.',deletedToast:'تم حذف الصنف',uploadImage:'تحميل صورة',removeImage:'إزالة الصورة',image:'صورة الصنف'},
  purchasing:{newPO:'طلب شراء جديد',suppliers:'الموردون النشطون',openPOs:'طلبات الشراء المفتوحة',avgDelivery:'متوسط مدة التسليم',supplierPerf:'أداء الموردين',poList:'أحدث طلبات الشراء',supplier:'المورد',deliveryDate:'تاريخ التسليم المتوقع',item:'الصنف',qty:'الكمية',unitPrice:'سعر الوحدة (ر.س)',notes:'ملاحظات',total:'الإجمالي',submitOrder:'إرسال الطلب',orderAdded:'تم إرسال طلب الشراء بنجاح'},
  issues:{newRequest:'طلب صرف مواد جديد',pending:'بانتظار الموافقة',approvedToday:'تمت الموافقة اليوم',departments:'الأقسام المخدومة',list:'أحدث طلبات الصرف',department:'القسم',priority:'الأولوية',priorityNormal:'عادي',priorityUrgent:'عاجل',priorityCritical:'حرج',requiredQty:'الكمية المطلوبة',requiredDate:'تاريخ الحاجة',reason:'السبب / الغرض',submitRequest:'إرسال الطلب',requestAdded:'تم إرسال طلب الصرف بنجاح'},
  movements:{title:'سجل الحركة',inbound:'وارد',outbound:'صادر',transfer:'تحويل'},
  reports:{slow:'الأصناف الراكدة',fast:'الأصناف سريعة الحركة',purchases:'تقرير المشتريات',disbursement:'الصرف حسب المشروع',suppliers:'تقرير الموردين',inventory:'تقرير الجرد',stock:'تقرير المخزون الحالي',valuation:'تقييم المخزون',utilization:'استغلال المستودع',exportExcel:'تصدير إلى Excel',exportPdf:'تصدير PDF',print:'طباعة',applyFilter:'تطبيق',resetFilter:'إعادة',fromDate:'من تاريخ',toDate:'إلى تاريخ',colItem:'الصنف',colSku:'الرمز',colStock:'الرصيد',colMin:'الحد الأدنى',colLocation:'الموقع',colStatus:'الحالة',colMovement:'آخر حركة',colMovements:'عدد الحركات',colSupplier:'المورد',colOrders:'الطلبات',colTotal:'الإجمالي (ر.س)',colDate:'التاريخ',colDepartment:'القسم',colQty:'الكمية',colPriority:'الأولوية',colDelivery:'التسليم (أيام)',colQuality:'الجودة (%)',colSpend:'إجمالي المشتريات (ر.س)',colValue:'القيمة التقديرية (ر.س)',noData:'لا توجد بيانات تطابق الفترة المحددة'},
  users:{addUser:'إضافة مستخدم',role:'الدور',lastActive:'آخر نشاط',admin:'مدير النظام',manager:'مدير المستودع',supervisor:'مشرف',employee:'موظف'},
  notif:{markAll:'تعليم الكل كمقروء',lowStockMsg:'انخفض عن الحد الأدنى للمخزون',expiryMsg:'يقترب من تاريخ انتهاء الصلاحية',approvalMsg:'بانتظار موافقتك',systemMsg:'اكتملت الصيانة المجدولة بنجاح',todayTitle:'اليوم',upcomingTitle:'القادم'},
  calendar:{title:'التقويم',btnAdd:'إضافة موعد',btnCancel:'إلغاء',eventName:'اسم الموعد',eventDate:'التاريخ',eventTime:'الوقت',addTitle:'موعد جديد',noEvents:'لا توجد مواعيد',today:'اليوم',monthNames:['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],dayNames:['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],eventNotifPrefix:'موعد قادم',todayEvents:'موعد اليوم'},
  settings:{
    appearance:'المظهر',darkMode:'الوضع الداكن',darkModeSub:'التبديل بين الواجهة الفاتحة والداكنة',language:'اللغة والمنطقة',langSub:'لغة الواجهة واتجاه النص',notifGroup:'التنبيهات',lowStockAlerts:'تنبيهات انخفاض المخزون',lowStockSub:'التنبيه عند انخفاض الصنف عن الحد الأدنى',expiryAlerts:'تنبيهات انتهاء الصلاحية',expirySub:'التنبيه قبل وصول الصنف لتاريخ الانتهاء',approvalNotif:'طلبات الموافقة',approvalSub:'التنبيه عند وجود عناصر بانتظار الموافقة',system:'النظام',backup:'النسخ الاحتياطي والاستعادة',backupSub:'نسخ احتياطي يومي تلقائي لقاعدة البيانات المحلية',offline:'وضع عدم الاتصال',offlineSub:'الاستمرار بالعمل دون اتصال بالإنترنت',light:'فاتح',dark:'داكن',auto:'تلقائي'
  },
  projects:{list:'قائمة المشاريع',dashboard:'لوحة المشاريع',plan:'خطة الأتمتة',newProject:'مشروع جديد',editProject:'تعديل المشروع',deleteProject:'حذف المشروع',deleteConfirm:'هل أنت متأكد من حذف هذا المشروع؟',projectName:'اسم المشروع',projectNumber:'رقم المشروع',client:'العميل',type:'النوع',location:'الموقع',manager:'مدير المشروع',contractValue:'قيمة العقد',contractDate:'تاريخ العقد',startDate:'تاريخ البداية',duration:'المدة (أيام)',endDate:'تاريخ الانتهاء المتوقع',progress:'نسبة الإنجاز',status:'الحالة',priority:'الأولوية',contractNo:'رقم العقد',contractFile:'العقد (PDF)',coordinates:'الإحداثيات',engineer:'المهندس المسؤول',notes:'ملاحظات',phases:'المراحل',materials:'المواد',purchases:'المشتريات',team:'الفريق',documents:'المستندات',gallery:'معرض الصور',activityLog:'سجل النشاط',risks:'المخاطر',alerts:'التنبيهات',addMaterial:'إضافة مادة',editMaterial:'تعديل المادة',importExcel:'استيراد من Excel',importBOM:'استيراد BOM',materialName:'اسم المادة',qtyRequired:'الكمية المطلوبة',qtyIssued:'الكمية المصروفة',qtyRemaining:'الكمية المتبقية',qtyAvailable:'المتاح في المستودع',materialStatus:'الحالة',statusProvided:'متوفرة',statusOrdered:'قيد الطلب',statusNotAvailable:'غير متوفرة',issueDate:'تاريخ الصرف',issueRef:'رقم الإذن',receivedBy:'المستلم',issuedBy:'تم الصرف بواسطة',poNumber:'رقم أمر الشراء',supplier:'المورد',orderValue:'قيمة الطلب',orderDate:'تاريخ الطلب',deliveryDate:'تاريخ التوريد',orderStatus:'حالة الطلب',teamMember:'عضو الفريق',role:'الدور',addMember:'إضافة عضو',documentName:'اسم المستند',docType:'نوع المستند',uploadDate:'تاريخ الرفع',addDocument:'إضافة مستند',imageCategory:'تصنيف الصورة',beforeExec:'قبل التنفيذ',duringExec:'أثناء التنفيذ',afterExec:'بعد التنفيذ',addImage:'إضافة صورة',logEntry:'حدث',addNote:'إضافة ملاحظة',riskName:'المخاطرة',riskLevel:'مستوى المخاطرة',addRisk:'إضافة مخاطرة',activeProjects:'المشاريع النشطة',completedProjects:'المشاريع المكتملة',overdueProjects:'المشاريع المتأخرة',totalProjectsValue:'إجمالي قيمة المشاريع',upcomingDeadlines:'المواعيد القريبة',overdueList:'المشاريع المتأخرة',mostUsedMaterials:'أكثر المواد استخداماً',topProgress:'أعلى إنجاز',daysRemaining:'يوم متبقي',phase:'المرحلة',startDatePhase:'تاريخ البدء',endDatePhase:'تاريخ النهاية',responsible:'المسؤول',phaseStatus:'حالة المرحلة',phaseNotStarted:'لم تبدأ',phaseInProgress:'قيد التنفيذ',phaseCompleted:'مكتملة',phaseDelayed:'متأخرة',alertNearDeadline:'اقتراب موعد انتهاء المشروع',alertOverdue:'تأخر المشروع عن الجدول',alertMaterialShortage:'نقص في المواد',alertContractEnding:'اقتراب انتهاء العقد',alertMaterialArrived:'وصول المواد',alertSupplierDelay:'تأخر الموردين',searchProjects:'ابحث بالاسم أو العميل أو الرقم...',allStatus:'جميع الحالات',allPriority:'جميع الأولويات',filter:'تصفية',export:'تصدير',exportExcel:'تصدير إلى Excel',overall:'الإنجاز الإجمالي',totalMaterials:'إجمالي المواد',provided:'متوفرة',onOrder:'قيد الطلب',notAvailable:'غير متوفرة',materialSummary:'ملخص المواد',issueOrders:'أوامر الصرف',purchaseOrders:'أوامر الشراء',teamMembers:'أعضاء الفريق',documentsList:'المستندات',imageGallery:'معرض الصور',activityHistory:'سجل النشاط',riskRegistry:'سجل المخاطر',alertsList:'التنبيهات',noData:'لا توجد مشاريع',noMaterials:'لا توجد مواد',noPhases:'لا توجد مراحل',noTeam:'لا يوجد أعضاء',noDocs:'لا توجد مستندات',noImages:'لا توجد صور',noNotes:'لا توجد أحداث',noRisks:'لا توجد مخاطر',noAlerts:'لا توجد تنبيهات',unknown:'غير معروف','Phase 1':'توقيع العقد','Phase 2':'اعتماد المخططات','Phase 3':'تجهيز المواد','Phase 4':'التصنيع','Phase 5':'الدهان','Phase 6':'النقل','Phase 7':'التركيب','Phase 8':'الاستلام الابتدائي','Phase 9':'الاستلام النهائي'},
  units:{days:'يوم'},
  profile:{title:'تعديل الملف الشخصي',name:'الاسم الكامل',role:'الدور الوظيفي',email:'البريد الإلكتروني',changePhoto:'تغيير الصورة',removePhoto:'إزالة الصورة',saved:'تم تحديث الملف الشخصي بنجاح'},
}};

let lang = 'en';
let theme = 'light';

function t(path){
  return path.split('.').reduce((o,k)=>(o&&o[k]!==undefined)?o[k]:null, STR[lang]);
}

/* ===================================================================
   MOCK DATA
=================================================================== */
const reqsData = withFirestoreSync([
  {id:'REQ-551', dept:'Production Line 1', deptAr:'خط الإنتاج 1', item:'Bearing Kit (BK-900)', itemAr:'طقم محامل (BK-900)', qty:20, status:'pending', priority:'normal', date:'2025-06-10', reason:'Schedule maintenance'},
  {id:'REQ-552', dept:'Maintenance', deptAr:'الصيانة', item:'Pneumatic Drill (PD-75)', itemAr:'مثقاب هوائي (PD-75)', qty:2, status:'approved', priority:'urgent', date:'2025-06-08', reason:'Production line B repair'},
  {id:'REQ-553', dept:'Assembly Line 2', deptAr:'خط التجميع 2', item:'Gear Assembly Unit', itemAr:'وحدة تجميع التروس', qty:6, status:'pending', priority:'normal', date:'2025-06-12', reason:'New order fulfillment'},
], 'material_requests', 'id');

const inventoryData = withFirestoreSync([
  {name:'Heavy-Duty Hydraulic Pump (AP-500)', nameAr:'مضخة هيدروليكية ثقيلة (AP-500)', sku:'SKU-880012', cat:'Pumps & Motors', catAr:'مضخات ومحركات', stock:74, min:30, loc:'WH-A / Shelf 12'},
  {name:'Industrial Control Panel (X-340)', nameAr:'لوحة تحكم صناعية (X-340)', sku:'SKU-654001', cat:'Automation', catAr:'الأتمتة', stock:31, min:40, loc:'Production Floor'},
  {name:'Pneumatic Drill (PD-75)', nameAr:'مثقاب هوائي (PD-75)', sku:'SKU-123456', cat:'Tools', catAr:'أدوات', stock:112, min:50, loc:'WH-B / Shelf 03'},
  {name:'Bearing Kit (BK-900)', nameAr:'طقم محامل (BK-900)', sku:'SKU-230911', cat:'Bearings', catAr:'محامل', stock:455, min:100, loc:'Shelf 05B'},
  {name:'Steel Coil — Grade A', nameAr:'لفافة صلب — درجة أ', sku:'SKU-S4109', cat:'Raw Materials', catAr:'مواد خام', stock:12, min:50, loc:'WH-A / Yard 2'},
  {name:'Gear Assembly Unit', nameAr:'وحدة تجميع التروس', sku:'SKU-M2033', cat:'Automation', catAr:'الأتمتة', stock:8, min:30, loc:'WH-C / Shelf 9'},
  {name:'Raw Polymer Pellets', nameAr:'حبيبات بوليمر خام', sku:'SKU-R1102', cat:'Raw Materials', catAr:'مواد خام', stock:21, min:60, loc:'WH-A / Silo 1'},
  {name:'Conveyor Belt Roller', nameAr:'بكرة سير ناقل', sku:'SKU-771820', cat:'Tools', catAr:'أدوات', stock:188, min:40, loc:'WH-B / Shelf 14'},
], 'inventory', 'sku');

const warehouseData = withFirestoreSync([
  {name:'Warehouse A — Raw Materials', nameAr:'مستودع أ — المواد الخام', occ:82, items:'21,300 / 25,600', sections:14, color:'var(--blue)'},
  {name:'Warehouse B — Components', nameAr:'مستودع ب — المكونات', occ:60, items:'22,000 / 36,600', sections:9, color:'var(--blue)'},
  {name:'Warehouse C — Finished Goods', nameAr:'مستودع ج — منتجات تامة', occ:90, items:'21,000 / 23,600', sections:11, color:'var(--red)'},
  {name:'Warehouse D — Tools & Spares', nameAr:'مستودع د — أدوات وقطع غيار', occ:45, items:'15,000 / 23,600', sections:7, color:'var(--blue)'},
  {name:'Warehouse E — Quarantine', nameAr:'مستودع هـ — الحجر', occ:18, items:'2,100 / 12,000', sections:3, color:'var(--green)'},
  {name:'Warehouse F — Export Staging', nameAr:'مستودع و — تجهيز التصدير', occ:71, items:'9,800 / 13,800', sections:5, color:'var(--blue)'},
], 'warehouses', 'name');

const suppliers = [
  {name:'Al-Bina Steel Co.', nameAr:'شركة البناء للصلب', delivery:16, quality:90, orders:24, status:'good'},
  {name:'Gulf Hydraulics Ltd.', nameAr:'الخليج للهيدروليك', delivery:12, quality:98, orders:10, status:'delay'},
  {name:'Falcon Automation', nameAr:'فالكون للأتمتة', delivery:11, quality:84, orders:23, status:'good'},
  {name:'Eastern Polymers', nameAr:'الشرقية للبوليمرات', delivery:7, quality:79, orders:10, status:'good'},
];


/* ===================================================================
   PROJECTS DATA
=================================================================== */
const defaultPhases = [
  {id:'P1', name:'Phase 1', nameAr:'المرحلة 1'},{id:'P2', name:'Phase 2', nameAr:'المرحلة 2'},{id:'P3', name:'Phase 3', nameAr:'المرحلة 3'},
  {id:'P4', name:'Phase 4', nameAr:'المرحلة 4'},{id:'P5', name:'Phase 5', nameAr:'المرحلة 5'},{id:'P6', name:'Phase 6', nameAr:'المرحلة 6'},
  {id:'P7', name:'Phase 7', nameAr:'المرحلة 7'},{id:'P8', name:'Phase 8', nameAr:'المرحلة 8'},{id:'P9', name:'Phase 9', nameAr:'المرحلة 9'},
];
const PROJECT_STATUSES = ['active','completed','onHold','cancelled'];
const PROJECT_PRIORITIES = ['high','medium','low'];
let projCounter = 5;
function nextProjectId(){
  // Same fix as nextPOId(): derive from the highest existing project
  // number currently in memory (including data restored from Supabase),
  // not a stale page-load-time counter, to avoid id collisions.
  const maxExisting = projects.reduce((max, p) => {
    const n = parseInt(String(p.id||'').replace('PRJ-',''), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, projCounter - 1);
  projCounter = maxExisting + 2;
  return 'PRJ-'+String(maxExisting+1).padStart(3,'0');
}
const projects = withFirestoreSync([
  {id:'PRJ-001',name:'Factory Automation Line A',nameAr:'خط الأتمتة أ',client:'Saudi Manufacturing Co.',clientAr:'شركة التصنيع السعودية',type:'Industrial',typeAr:'صناعي',location:'Dammam 2nd Industrial City',locationAr:'الدمام المدينة الصناعية الثانية',coords:'26.4207°N, 50.0888°E',manager:'Ahmed Al-Faraj',engineer:'Khalid Nasser',contractNo:'CON-2026-001',contractFile:'',contractValue:2850000,contractDate:'2026-01-15',startDate:'2026-02-01',duration:150,progress:65,status:'active',priority:'high',notes:'Second phase expansion project',notesAr:'مشروع التوسعة المرحلة الثانية',
    phases:[
      {id:'P1',status:'completed',start:'2026-01-15',end:'2026-01-20',resp:'Sarah Chen',notes:'Signed on time',notesAr:'تم التوقيع',progress:100},
      {id:'P2',status:'completed',start:'2026-01-21',end:'2026-02-10',resp:'Ali Hassan',notes:'Approved',notesAr:'تم الاعتماد',progress:100},
      {id:'P3',status:'completed',start:'2026-02-11',end:'2026-03-15',resp:'Khalid Nasser',notes:'Materials received',notesAr:'تم الاستلام',progress:100},
      {id:'P4',status:'inProgress',start:'2026-03-16',end:'2026-05-30',resp:'Ahmed Al-Faraj',notes:'On schedule',notesAr:'حسب الجدول',progress:70},
      {id:'P5',status:'notStarted',start:'2026-06-01',end:'2026-06-20',resp:'',notes:'',notesAr:'',progress:0},
      {id:'P6',status:'notStarted',start:'2026-06-21',end:'2026-07-05',resp:'',notes:'',notesAr:'',progress:0},
      {id:'P7',status:'notStarted',start:'2026-07-06',end:'2026-07-25',resp:'',notes:'',notesAr:'',progress:0},
      {id:'P8',status:'notStarted',start:'2026-07-26',end:'2026-07-30',resp:'',notes:'',notesAr:'',progress:0},
      {id:'P9',status:'notStarted',start:'2026-07-31',end:'2026-08-05',resp:'',notes:'',notesAr:'',progress:0}
    ],
    materials:[
      {id:'M1',name:'Steel Coil — Grade A',nameAr:'لفافة صلب درجة أ',qtyReq:500,qtyIssued:350,qtyRemaining:150,status:'provided'},
      {id:'M2',name:'Hydraulic Pump (AP-500)',nameAr:'مضخة هيدروليكية',qtyReq:12,qtyIssued:8,qtyRemaining:4,status:'provided'},
      {id:'M3',name:'Control Panel (X-340)',nameAr:'لوحة تحكم',qtyReq:6,qtyIssued:2,qtyRemaining:4,status:'ordered'},
      {id:'M4',name:'Bearing Kit (BK-900)',nameAr:'طقم محامل',qtyReq:200,qtyIssued:0,qtyRemaining:200,status:'notAvailable'},
    ],
    team:[
      {name:'Ahmed Al-Faraj',role:'manager',roleAr:'مدير مشروع'},{name:'Khalid Nasser',role:'engineer',roleAr:'مهندس مسؤول'},{name:'Sami Othman',role:'supervisor',roleAr:'مراقب'},{name:'Fahad Ali',role:'storekeeper',roleAr:'مسؤول مستودع'}
    ],
    docs:[{name:'Contract Document',type:'PDF',date:'2026-01-15',url:''},{name:'Shop Drawings - Electrical',type:'DWG',date:'2026-01-25',url:''}],
    images:[{src:'',cat:'before',date:'2026-01-20',desc:'Site before work'},{src:'',cat:'during',date:'2026-03-10',desc:'Foundation work'}],
    notesLog:[{text:'Project kickoff meeting completed',textAr:'تم اجتماع بدء المشروع',user:'admin',date:'2026-02-01'},{text:'First shipment of materials received',textAr:'تم استلام الشحنة الأولى',user:'admin',date:'2026-02-20'}],
    risks:[{name:'Material delay from supplier',nameAr:'تأخير المواد من المورد',level:'high',status:'active',date:'2026-02-01'},{name:'Weather impact on painting',nameAr:'تأثير الطقس على الدهان',level:'medium',status:'active',date:'2026-03-01'}],
    issueOrders:[{date:'2026-03-01',ref:'ISS-001',material:'Steel Coil',qty:200,receivedBy:'Fahad Ali',issuedBy:'Ahmed Al-Faraj'},{date:'2026-03-15',ref:'ISS-002',material:'Hydraulic Pump',qty:4,receivedBy:'Fahad Ali',issuedBy:'Ahmed Al-Faraj'}],
    poRefs:[],
  },
  {id:'PRJ-002',name:'Warehouse Expansion - Zone C',nameAr:'توسعة المستودع - المنطقة ج',client:'Al-Bina Steel Co.',clientAr:'شركة البناء للصلب',type:'Construction',typeAr:'إنشائي',location:'Riyadh - Al-Kharj Road',locationAr:'الرياض - طريق الخرج',coords:'24.7136°N, 46.6753°E',manager:'Sarah Chen',engineer:'Layla Mansour',contractNo:'CON-2026-002',contractFile:'',contractValue:1800000,contractDate:'2026-03-01',startDate:'2026-03-15',duration:120,progress:30,status:'active',priority:'medium',notes:'Adding 2000sqm storage capacity',notesAr:'إضافة 2000 متر مربع',
    phases:[
      {id:'P1',status:'completed',start:'2026-03-01',end:'2026-03-05',resp:'Sarah Chen',notes:'Signed',notesAr:'تم التوقيع',progress:100},
      {id:'P2',status:'inProgress',start:'2026-03-06',end:'2026-03-25',resp:'Omar Hassan',notes:'Under review',notesAr:'قيد المراجعة',progress:60},
      {id:'P3',status:'notStarted',start:'2026-03-26',end:'2026-04-20',resp:'',notes:'',notesAr:'',progress:0},
      {id:'P4',status:'notStarted',start:'2026-04-21',end:'2026-05-30',resp:'',notes:'',notesAr:'',progress:0},
      {id:'P5',status:'notStarted',start:'2026-06-01',end:'2026-06-15',resp:'',notes:'',notesAr:'',progress:0},
      {id:'P6',status:'notStarted',start:'2026-06-16',end:'2026-06-30',resp:'',notes:'',notesAr:'',progress:0},
      {id:'P7',status:'notStarted',start:'2026-07-01',end:'2026-07-10',resp:'',notes:'',notesAr:'',progress:0},
      {id:'P8',status:'notStarted',start:'2026-07-11',end:'2026-07-13',resp:'',notes:'',notesAr:'',progress:0},
      {id:'P9',status:'notStarted',start:'2026-07-14',end:'2026-07-15',resp:'',notes:'',notesAr:'',progress:0}
    ],
    materials:[{id:'M1',name:'Steel Coil — Grade A',nameAr:'لفافة صلب درجة أ',qtyReq:300,qtyIssued:100,qtyRemaining:200,status:'provided'},{id:'M2',name:'Conveyor Belt Roller',nameAr:'بكرة سير ناقل',qtyReq:50,qtyIssued:0,qtyRemaining:50,status:'ordered'}],
    team:[{name:'Sarah Chen',role:'manager',roleAr:'مديرة مشروع'},{name:'Layla Mansour',role:'engineer',roleAr:'مهندسة مسؤولة'}],
    docs:[{name:'BOQ Document',type:'XLSX',date:'2026-03-05',url:''}],
    images:[],
    notesLog:[{text:'Site handover completed',textAr:'تم تسليم الموقع',user:'admin',date:'2026-03-16'}],
    risks:[{name:'Foundation delay due to weather',nameAr:'تأخير الأساسات بسبب الطقس',level:'medium',status:'active',date:'2026-03-10'}],
    issueOrders:[],poRefs:[],
  },
  {id:'PRJ-003',name:'Conveyor System Upgrade',nameAr:'تطوير نظام الناقل',client:'Gulf Hydraulics Ltd.',clientAr:'الخليج للهيدروليك',type:'Maintenance',typeAr:'صيانة',location:'Jubail Industrial City',locationAr:'الجبيل الصناعية',coords:'27.0046°N, 49.6611°E',manager:'Khalid Nasser',engineer:'Sami Othman',contractNo:'CON-2026-003',contractFile:'',contractValue:950000,contractDate:'2026-04-01',startDate:'2026-04-10',duration:75,progress:100,status:'completed',priority:'low',notes:'Completed ahead of schedule',notesAr:'تم الإنجاز قبل الموعد',
    phases:[
      {id:'P1',status:'completed',start:'2026-04-01',end:'2026-04-05',resp:'Khalid Nasser',progress:100},
      {id:'P2',status:'completed',start:'2026-04-06',end:'2026-04-12',progress:100},
      {id:'P3',status:'completed',start:'2026-04-13',end:'2026-04-25',progress:100},
      {id:'P4',status:'completed',start:'2026-04-26',end:'2026-05-20',progress:100},
      {id:'P5',status:'completed',start:'2026-05-21',end:'2026-05-28',progress:100},
      {id:'P6',status:'completed',start:'2026-05-29',end:'2026-06-05',progress:100},
      {id:'P7',status:'completed',start:'2026-06-06',end:'2026-06-18',progress:100},
      {id:'P8',status:'completed',start:'2026-06-19',end:'2026-06-22',progress:100},
      {id:'P9',status:'completed',start:'2026-06-23',end:'2026-06-25',progress:100}
    ],
    materials:[{id:'M1',name:'Gear Assembly Unit',nameAr:'وحدة تجميع التروس',qtyReq:4,qtyIssued:4,qtyRemaining:0,status:'provided'},{id:'M2',name:'Pneumatic Drill (PD-75)',nameAr:'مثقاب هوائي',qtyReq:2,qtyIssued:2,qtyRemaining:0,status:'provided'}],
    team:[{name:'Khalid Nasser',role:'manager',roleAr:'مدير مشروع'},{name:'Sami Othman',role:'engineer',roleAr:'مهندس'},{name:'Fahad Ali',role:'storekeeper',roleAr:'مسؤول مستودع'}],
    docs:[{name:'Maintenance Report',type:'PDF',date:'2026-06-26',url:''},{name:'As-Built Drawings',type:'DWG',date:'2026-06-26',url:''}],
    images:[{src:'',cat:'before',date:'2026-04-08',desc:'Old conveyor system'},{src:'',cat:'after',date:'2026-06-26',desc:'New system installed'}],
    notesLog:[{text:'Project completed 5 days early',textAr:'تم إنجاز المشروع قبل الموعد بـ5 أيام',user:'admin',date:'2026-06-25'},{text:'Client signed handover certificate',textAr:'وقع العميل على شهادة التسليم',user:'admin',date:'2026-06-26'}],
    risks:[{name:'Spare parts availability',nameAr:'توفر قطع الغيار',level:'low',status:'resolved',date:'2026-04-10'}],
    issueOrders:[{date:'2026-04-20',ref:'ISS-003',material:'Gear Assembly Unit',qty:4,receivedBy:'Fahad Ali',issuedBy:'Khalid Nasser'}],poRefs:[],
  },
  {id:'PRJ-004',name:'Paint Shop Installation',nameAr:'تركيب ورشة الدهان',client:'Eastern Polymers',clientAr:'الشرقية للبوليمرات',type:'Industrial',typeAr:'صناعي',location:'Dammam 2nd Industrial City',locationAr:'الدمام المدينة الصناعية الثانية',coords:'26.4330°N, 50.0991°E',manager:'Ahmed Al-Faraj',engineer:'Layla Mansour',contractNo:'CON-2026-004',contractFile:'',contractValue:3200000,contractDate:'2026-05-01',startDate:'2026-05-15',duration:210,progress:10,status:'active',priority:'high',notes:'New paint line for polymer coating',notesAr:'خط دهان جديد لطلاء البوليمر',
    phases:[
      {id:'P1',status:'completed',start:'2026-05-01',end:'2026-05-10',resp:'Ahmed Al-Faraj',notes:'Signed',progress:100},
      {id:'P2',status:'inProgress',start:'2026-05-11',end:'2026-06-01',resp:'Engineer team',notes:'Under review',notesAr:'قيد المراجعة',progress:40},
      {id:'P3',status:'notStarted',start:'2026-06-02',end:'2026-07-01',progress:0},
      {id:'P4',status:'notStarted',start:'2026-07-02',end:'2026-09-01',progress:0},
      {id:'P5',status:'notStarted',start:'2026-09-02',end:'2026-09-20',progress:0},
      {id:'P6',status:'notStarted',start:'2026-09-21',end:'2026-10-10',progress:0},
      {id:'P7',status:'notStarted',start:'2026-10-11',end:'2026-11-15',progress:0},
      {id:'P8',status:'notStarted',start:'2026-11-16',end:'2026-11-30',progress:0},
      {id:'P9',status:'notStarted',start:'2026-12-01',end:'2026-12-15',progress:0}
    ],
    materials:[
      {id:'M1',name:'Raw Polymer Pellets',nameAr:'حبيبات بوليمر خام',qtyReq:1000,qtyIssued:0,qtyRemaining:1000,status:'ordered'},
      {id:'M2',name:'Steel Coil — Grade A',nameAr:'لفافة صلب درجة أ',qtyReq:200,qtyIssued:0,qtyRemaining:200,status:'notAvailable'},
      {id:'M3',name:'Control Panel (X-340)',nameAr:'لوحة تحكم صناعية',qtyReq:3,qtyIssued:0,qtyRemaining:3,status:'ordered'},
    ],
    team:[{name:'Ahmed Al-Faraj',role:'manager',roleAr:'مدير مشروع'},{name:'Layla Mansour',role:'engineer',roleAr:'مهندسة مسؤولة'},{name:'Sami Othman',role:'supervisor',roleAr:'مراقب'}],
    docs:[{name:'Paint Shop Layout',type:'DWG',date:'2026-05-12',url:''}],images:[],
    notesLog:[{text:'Foundation work started',textAr:'بدأت أعمال الأساسات',user:'admin',date:'2026-05-20'}],
    risks:[{name:'Raw material price fluctuation',nameAr:'تقلب أسعار المواد الخام',level:'high',status:'active',date:'2026-05-01'}],
    issueOrders:[],poRefs:[],
  },
], 'projects', 'id');

/* Nested edits inside a project (images, notes, tasks, team, docs, risks)
   mutate a sub-array/object inside a project record, not the `projects`
   array itself — so the withFirestoreSync proxy on `projects` never
   fires for them. Call this manually right after any such nested edit
   to force a re-sync of the current project state to Supabase. */
function syncCurrentProject(){
  if(window.StockFlowBackend && window.StockFlowBackend.enabled){
    window.StockFlowBackend.syncCollection('projects', projects, 'id');
  }
}

const activity = [
  {type:'received', name:'Sarah Chen', sub:'SKU-880012 · Hydraulic Pump', time:5},
  {type:'shipped', name:'Ahmed Al-Faraj', sub:'PO-2291 · 3 pallets', time:42},
  {type:'moved', name:'Khalid Nasser', sub:'WH-A → WH-C', time:75},
  {type:'received', name:'Layla Mansour', sub:'SKU-R1102 · Raw Polymer', time:130},
];

/* ===================================================================
   PAGE RENDER: DASHBOARD
=================================================================== */
const DASH_SECTION_KEYS = ['stats','chart-cal','alerts-act','proj-plan','dist-actions'];

function getDashSections(){
  let saved;
  try{ saved = JSON.parse(localStorage.getItem('stockflow_dash_order')); }catch(e){}
  if(!Array.isArray(saved) || saved.length!==DASH_SECTION_KEYS.length || !saved.every(k=>DASH_SECTION_KEYS.includes(k))){
    saved = [...DASH_SECTION_KEYS];
  }
  return saved;
}

function saveDashSections(arr){
  localStorage.setItem('stockflow_dash_order', JSON.stringify(arr));
}

function renderDashSection(key, cc){
  const L = STR[lang];
  const todayStr = fmtDate(new Date());
  const arrows = cc
    ? `<span class="dash-arrows"><span class="dash-arrow up" data-sk="${key}">${ICONS.chevronUp||'▲'}</span><span class="dash-arrow down" data-sk="${key}">${ICONS.chevronDown||'▼'}</span></span>`
    : '';
  switch(key){
    case 'stats':
      return `<div class="grid-stats dash-sect" data-sk="stats">${arrows}
        ${statCard(ICONS.box,'var(--blue)','var(--blue-soft)', L.kpi.totalItems, '64,120', '+4.5%', true)}
        ${statCard(ICONS.dollar,'var(--green)','var(--green-soft)', L.kpi.invValue, RYAL+'&nbsp;1.25M', '+3.1%', true)}
        ${statCard(ICONS.flag,'var(--red)','var(--red-soft)', L.kpi.lowStock, '48', '+12', false)}
        ${statCard(ICONS.purchase,'var(--amber)','var(--amber-soft)', L.kpi.activeOrders, '35', '+6', true)}
      </div>`;
    case 'chart-cal':
      return `<div class="row-2 dash-sect" data-sk="chart-cal">${arrows}
        <div class="card">
          <div class="card-head"><div class="card-title">${L.weekly.title}</div></div>
          <canvas id="weeklyChart" height="150"></canvas>
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title">${L.calendar.title}</div>
            <button class="cal-add-btn" id="dashCalAddBtn" title="${lang==='en'?'Add Event':'إضافة موعد'}" style="width:28px;height:28px;font-size:15px;">+</button>
          </div>
          <div class="dash-cal">
            <div class="cal-header" style="padding:0 0 6px;">
              <button class="cal-arrow" id="dashCalPrev">◀</button>
              <span class="cal-title" id="dashCalTitle">${L.calendar.monthNames[new Date().getMonth()]} ${new Date().getFullYear()}</span>
              <button class="cal-arrow" id="dashCalNext">▶</button>
            </div>
            <div class="cal-grid" id="dashCalGrid" style="padding:0 0 8px;"></div>
            <div class="cal-events" style="border-top:1px solid var(--border);">
              <div class="cal-events-header" style="padding:6px 0;">
                <span id="dashCalDateLabel" style="font-size:11px;color:var(--text-2);">${todayStr}</span>
              </div>
              <div class="cal-events-body" id="dashCalBody" style="padding:0 0 4px;max-height:110px;"></div>
            </div>
          </div>
        </div>
      </div>`;
    case 'alerts-act':
      return `<div class="row-2 dash-sect" data-sk="alerts-act">${arrows}
        <div class="card">
          <div class="card-head"><div class="card-title">${L.lowAlerts.title}</div><button class="link-btn" data-goto="inventory">${lang==='en'?'View all':'عرض الكل'}</button></div>
          ${inventoryData.filter(i=>i.stock<i.min).slice(0,3).map(i=>{
            const crit = i.stock < i.min*0.5;
            return `<div class="alert-row">
              <div class="alert-icon">${ICONS.flag}</div>
              <div class="alert-mid">
                <div class="alert-name">${lang==='en'?i.name:i.nameAr}</div>
                <div class="alert-sku">${i.sku} · ${i.stock} / ${i.min}</div>
              </div>
              ${crit?`<span class="pill pill-critical">${L.lowAlerts.critical}</span>`:`<button class="btn-mini" onclick="orderNow('${i.sku}')">${L.lowAlerts.orderNow}</button>`}
            </div>`;
          }).join('')}
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">${L.activity.title}</div></div>
          ${activity.map(a=>{
            const cfg = {received:{icon:ICONS.truckIn,bg:'var(--green-soft)',c:'var(--green)'}, shipped:{icon:ICONS.truckOut,bg:'var(--blue-soft)',c:'var(--blue)'}, moved:{icon:ICONS.move,bg:'var(--amber-soft)',c:'#a4720d'}}[a.type];
            return `<div class="activity-row">
              <div class="activity-icon" style="background:${cfg.bg};color:${cfg.c}">${cfg.icon}</div>
              <div>
                <div class="activity-title">${L.activity[a.type]} — ${a.name}</div>
                <div class="activity-sub">${a.sub}</div>
              </div>
              <div class="activity-time">${a.time}m ${L.activity.ago}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    case 'proj-plan':
      const activeProjs = projects.filter(p => p.status!=='completed' && p.status!=='cancelled');
      const sortedProjs = [...activeProjs].sort((a,b) => {
        const aR = calcDaysRemaining(calcEndDate(a.startDate, a.duration)) || 999;
        const bR = calcDaysRemaining(calcEndDate(b.startDate, b.duration)) || 999;
        return aR - bR;
      });
      return `<div class="row-2 dash-sect" data-sk="proj-plan">${arrows}
        <div class="card">
          <div class="card-head"><div class="card-title">${lang==='en'?'Automation Plan':'خطة الأتمتة'}</div>
          <button class="link-btn" data-goto="projects">${lang==='en'?'View all':'عرض الكل'}</button></div>
          ${sortedProjs.slice(0,5).map(p => {
            const end = calcEndDate(p.startDate, p.duration);
            const remain = calcDaysRemaining(end);
            const isOverdue = remain !== null && remain < 0;
            const pct = p.progress || 0;
            return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${lang==='en'?p.name:p.nameAr}</div>
                <div style="font-size:11px;color:var(--text-2);">
                  ${end||'—'} · ${isOverdue ? `<span style="color:var(--red);font-weight:700;">${Math.abs(remain)}${lang==='en'?'d overdue':'يوم تأخير'}</span>` : remain !== null ? `${remain}${lang==='en'?'d left':'يوم متبقي'}` : '—'}
                </div>
              </div>
              <div style="width:80px;">
                <div style="height:5px;background:var(--surface-2);border-radius:3px;">
                  <div style="width:${pct}%;height:100%;background:${isOverdue?'var(--red)':pct>=80?'var(--green)':'var(--blue)'};border-radius:3px;"></div>
                </div>
                <div style="font-size:10px;color:var(--text-3);text-align:center;margin-top:2px;">${pct}%</div>
              </div>
              <span class="pill ${getProjStatusClass(p.status)}" style="font-size:10px;">${getProjStatusLabel(p.status)}</span>
            </div>`;
          }).join('')}
          ${sortedProjs.length===0 ? `<div style="text-align:center;padding:20px;color:var(--text-3);font-size:13px;">${lang==='en'?'No active projects':'لا توجد مشاريع نشطة'}</div>` : ''}
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">${lang==='en'?'Upcoming Deadlines':'المواعيد القريبة'}</div></div>
          ${sortedProjs.filter(p => {
            const r = calcDaysRemaining(calcEndDate(p.startDate, p.duration));
            return r !== null && r >= 0 && r <= 14;
          }).slice(0,5).map(p => {
            const end = calcEndDate(p.startDate, p.duration);
            const remain = calcDaysRemaining(end);
            return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
              <div style="width:32px;height:32px;border-radius:8px;background:${remain<=3?'var(--red-soft)':'var(--blue-soft)'};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:${remain<=3?'var(--red)':'var(--blue)'};">${remain}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${lang==='en'?p.name:p.nameAr}</div>
                <div style="font-size:11px;color:var(--text-2);">${end}</div>
              </div>
            </div>`;
          }).join('')}
          ${sortedProjs.filter(p => {const r = calcDaysRemaining(calcEndDate(p.startDate, p.duration)); return r !== null && r >= 0 && r <= 14;}).length===0 ? `<div style="text-align:center;padding:20px;color:var(--text-3);font-size:13px;">${lang==='en'?'No upcoming deadlines in 14 days':'لا توجد مواعيد قريبة في 14 يوم'}</div>` : ''}
        </div>
      </div>`;
    case 'dist-actions':
      return `<div class="row-2 dash-sect" data-sk="dist-actions">${arrows}
        <div class="card">
          <div class="card-head"><div class="card-title">${L.dist.title}</div></div>
          <div class="donut-wrap">
            <canvas id="distChart" width="140" height="140" style="max-width:140px;max-height:140px;"></canvas>
            <div class="legend">
              <div class="legend-item"><span class="legend-sw" style="background:#0A66FF"></span>${L.dist.raw} · 37%</div>
              <div class="legend-item"><span class="legend-sw" style="background:#7CB2FF"></span>${L.dist.wip} · 28%</div>
              <div class="legend-item"><span class="legend-sw" style="background:#C9DCFA"></span>${L.dist.finished} · 35%</div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">${lang==='en'? 'Quick Actions':'إجراءات سريعة'}</div></div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <button class="btn" data-goto="inventory" style="justify-content:flex-start;">📦 ${lang==='en'?'Manage Inventory':'إدارة المخزون'}</button>
            <button class="btn" data-goto="warehouses" style="justify-content:flex-start;">🏭 ${lang==='en'?'View Warehouses':'عرض المستودعات'}</button>
            <button class="btn" data-goto="sales" style="justify-content:flex-start;">📄 ${lang==='en'?'Quotations':'عروض الأسعار'}</button>
          </div>
        </div>
      </div>`;
    default: return '';
  }
}

let dashCustomizing = false;

function renderDashboard(){
  const order = getDashSections();
  const cc = dashCustomizing;
  const topMsg = cc ? `<div class="dash-customize-bar"><span>${lang==='en'?'Drag or use arrows to reorder panels.':'اسحب أو استخدم الأسهم لإعادة ترتيب الأقسام.'}</span><button class="btn-mini" id="dashCustDone" style="background:var(--blue);color:#fff;">${lang==='en'?'Done':'تم'}</button></div>` : '';
  return topMsg + order.map(k=>renderDashSection(k, cc)).join('');
}

function statCard(icon,color,bg,label,value,trend,up){
  return `<div class="card stat-card">
    <div class="stat-top">
      <span class="stat-label">${label}</span>
      <div class="stat-icon" style="background:${bg};color:${color}">${icon}</div>
    </div>
    <div class="stat-value">${value}</div>
    <span class="stat-trend ${up?'trend-up':'trend-down'}">${up?'▲':'▼'} ${trend}</span>
  </div>`;
}

function mountDashboardCharts(){
  const isDark = theme==='dark';
  const gridColor = isDark?'#2B2E34':'#E4E7EC';
  const textColor = isDark?'#9A9DA6':'#62666F';
  const wctx = document.getElementById('weeklyChart');
  if(wctx){
    if(wctx.chart) wctx.chart.destroy();
    if(typeof Chart!=='undefined'){
      wctx.chart = new Chart(wctx,{type:'bar',data:{
        labels: lang==='en'?['Mon','Tue','Wed','Thu','Fri','Sat']:['اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'],
        datasets:[
          {label:STR[lang].weekly.inbound, data:[24,30,38,20,33,26], backgroundColor:'#0A66FF', borderRadius:6, barPercentage:.55},
          {label:STR[lang].weekly.outbound, data:[18,22,28,16,24,19], backgroundColor:isDark?'#444':'#C9D2DE', borderRadius:6, barPercentage:.55},
        ]},
        options:{responsive:true, plugins:{legend:{display:false}}, scales:{
          x:{grid:{display:false}, ticks:{color:textColor,font:{size:11}}},
          y:{grid:{color:gridColor}, ticks:{color:textColor,font:{size:11}}}
        }}
      });
    }
  }
  const dctx = document.getElementById('distChart');
  if(dctx){
    if(dctx.chart) dctx.chart.destroy();
    if(typeof Chart!=='undefined') dctx.chart = new Chart(dctx,{type:'doughnut',data:{
      labels:[STR[lang].dist.raw,STR[lang].dist.wip,STR[lang].dist.finished],
      datasets:[{data:[37,28,35], backgroundColor:['#0A66FF','#7CB2FF','#C9DCFA'], borderWidth:0}]
    }, options:{cutout:'68%', plugins:{legend:{display:false}}}});
  }
  mountDashCal();
}

let dashCalDate = new Date();
let dashCalSelected = fmtDate(new Date());

function renderDashCal(){
  const L = STR[lang];
  const d = new Date(dashCalDate);
  const year = d.getFullYear(), month = d.getMonth();
  d.setDate(1);
  const startDay = d.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const todayStr = fmtDate(new Date());

  const titleEl = document.getElementById('dashCalTitle');
  if(titleEl) titleEl.textContent = L.calendar.monthNames[month] + ' ' + year;

  let html = '';
  L.calendar.dayNames.forEach(n=>{ html += '<div class="cal-day" style="padding:3px 0;font-size:10px;">'+n+'</div>'; });
  for(let i=startDay-1; i>=0; i--){
    const day = daysInPrev - i;
    html += '<div class="cal-cell other" data-date="" style="padding:4px 0;font-size:11px;">'+day+'</div>';
  }
  for(let day=1; day<=daysInMonth; day++){
    const dateStr = fmtDate(new Date(year, month, day));
    const isToday = dateStr===todayStr;
    const hasEvent = getEventsForDate(dateStr).length>0;
    const isSelected = dateStr===dashCalSelected;
    html += '<div class="cal-cell'+(isToday?' today':'')+(hasEvent?' has-event':'')+(isSelected?' selected':'')+'" data-date="'+dateStr+'" style="padding:4px 0;font-size:11px;">'+day+'</div>';
  }
  const totalCells = startDay + daysInMonth;
  const remaining = (7 - totalCells%7)%7;
  for(let i=1; i<=remaining; i++){
    html += '<div class="cal-cell other" data-date="" style="padding:4px 0;font-size:11px;">'+i+'</div>';
  }
  const grid = document.getElementById('dashCalGrid');
  if(grid) grid.innerHTML = html;

  renderDashCalEvents();
}

function renderDashCalEvents(){
  const L = STR[lang];
  const events = getEventsForDate(dashCalSelected);
  const label = document.getElementById('dashCalDateLabel');
  if(label) label.textContent = dashCalSelected;
  const body = document.getElementById('dashCalBody');
  if(body) body.innerHTML = events.length
    ? events.map(e=>'<div class="cal-event-item" style="padding:4px 0;"><div class="cal-event-dot"></div><div class="cal-event-name" style="font-size:11px;">'+escapeHtml(e.name)+'</div><div class="cal-event-time" style="font-size:10px;">'+(e.time||'—')+'</div><button class="cal-event-del" data-id="'+e.id+'" style="font-size:12px;">×</button></div>').join('')
    : '<div class="cal-no-events" style="font-size:11px;padding:6px 0;">'+L.calendar.noEvents+'</div>';
}

function mountDashCal(){
  const prev = document.getElementById('dashCalPrev');
  const next = document.getElementById('dashCalNext');
  const grid = document.getElementById('dashCalGrid');
  const body = document.getElementById('dashCalBody');
  const addBtn = document.getElementById('dashCalAddBtn');
  if(!grid) return;
  dashCalDate = new Date();
  dashCalSelected = fmtDate(new Date());
  renderDashCal();

  if(prev) prev.onclick = function(e){ e.stopPropagation(); dashCalDate.setMonth(dashCalDate.getMonth()-1); renderDashCal(); };
  if(next) next.onclick = function(e){ e.stopPropagation(); dashCalDate.setMonth(dashCalDate.getMonth()+1); renderDashCal(); };
  if(grid) grid.onclick = function(e){
    const cell = e.target.closest('.cal-cell');
    if(!cell || !cell.dataset.date) return;
    grid.querySelectorAll('.cal-cell').forEach(c=>c.classList.remove('selected'));
    dashCalSelected = cell.dataset.date;
    cell.classList.add('selected');
    renderDashCalEvents();
  };
  if(body) body.onclick = function(e){
    const del = e.target.closest('.cal-event-del');
    if(!del) return;
    e.stopPropagation();
    const id = del.dataset.id;
    CAL_EVENTS = CAL_EVENTS.filter(e=>String(e.id)!==String(id));
    saveCalEvents();
    renderDashCalEvents();
    renderDashCal();
    const calGrid = document.getElementById('calGrid');
    if(calGrid){
      const cells = calGrid.querySelectorAll('.cal-cell');
      cells.forEach(c=>{ if(c.dataset.date) c.classList.toggle('has-event', getEventsForDate(c.dataset.date).length>0); });
    }
  };
  if(addBtn) addBtn.onclick = function(e){
    e.stopPropagation();
    const headerCalBtn = document.getElementById('calendarBtn');
    if(headerCalBtn) headerCalBtn.click();
  };
}

/* ===================================================================
   PAGE RENDER: INVENTORY
=================================================================== */

/* ===================================================================
   PAGE RENDER: SALES (QUOTATIONS)
=================================================================== */
let quotations = withFirestoreSync([
  {id:'AIF-F25-19', customer:'شركة الاوسط العربية للمقاولات', date:'2024-05-12', status:'sent', total:101890.00, 
   terms:'الأسعار تشمل ضريبة القيمة المضافة.\nالتسليم خلال 3 إلى 7 أيام من تاريخ تأكيد الطلب.\nالدفع مقدماً أو حسب الاتفاق.\nهذا العرض لا يعتبر عقداً ملزماً.\nفي حال استلامكم هذا العرض، نأمل التكرم بتوقيع وختم الموافقة.',
   payments:'يدفع 50% عند التعاقد والباقي عند الاستلام.',
   items:[
     {name:'حديد تسليح', desc:'سيخ حديد تسليح قطر 12 مم', qty:10, unit:'طن', price:2650.00},
    {name:'حديد تسليح', desc:'سيخ حديد تسليح قطر 16 مم', qty:15, unit:'طن', price:2600.00},
    {name:'حديد تسليح', desc:'سيخ حديد تسليح قطر 20 مم', qty:8, unit:'طن', price:2550.00},
    {name:'شبك تسليح', desc:'شبك تسليح 5×5 - قطر 6 مم', qty:50, unit:'لوح', price:42.00},
    {name:'أكسسوارات', desc:'أسلاك رباط', qty:100, unit:'كجم', price:6.00}
  ]},
  {id:'AIF-F25-20', customer:'شركة الخليج للمقاولات', date:'2024-06-01', status:'review', total:58750.00,
   phone:'055 987 6543', email:'info@gulf-contracting.sa', address:'جدة - حي الشرفية',
   validity:15, salesperson:'عبدالباسط',
   items:[
    {name:'حديد تسليح', desc:'سيخ حديد تسليح قطر 14 مم', qty:8, unit:'طن', price:2700.00},
    {name:'زوايا حديد', desc:'زاوية حديد 50×50 مم', qty:5, unit:'طن', price:3200.00},
    {name:'مواسير حديد', desc:'ماسورة حديد 2 بوصة', qty:3, unit:'طن', price:3800.00}
  ]},
  {id:'AIF-F25-21', customer:'مصنع الرياض للصناعات', date:'2024-06-15', status:'review', total:42300.00,
   phone:'056 111 2222', email:'info@riyadh-factory.sa', address:'الرياض - المدينة الصناعية',
   validity:20, salesperson:'نمر أحمد',
   items:[
    {name:'صاج حديد', desc:'صاج حديد سماكة 2 مم', qty:6, unit:'طن', price:3100.00},
    {name:'كمر H', desc:'كمر حديد H-Beam 200', qty:4, unit:'طن', price:5400.00}
  ]}
], 'quotations', 'id');

function getQuoteStatusText(status){
  if(status==='review') return lang==='en'?'Under Review':'تحت المراجعة';
  if(status==='approved') return lang==='en'?'Approved':'معتمد';
  if(status==='sent') return lang==='en'?'Sent':'تم الإرسال';
  return status;
}

function getQuoteStatusPill(status){
  if(status==='review') return 'pill-low';
  if(status==='approved') return 'pill-ok';
  if(status==='sent') return 'pill-ok';
  return 'pill-ok';
}

function toggleQuoteStatus(idx){
  const q = quotations[idx];
  if(!q) return;
  const cycle = {review:'approved', approved:'sent', sent:'review'};
  q.status = cycle[q.status] || 'review';
  renderQuoteRows(document.getElementById('quoteSearch')?.value||'', document.getElementById('quoteFilterStatus')?.value||'');
}

function renderQuoteRows(filter='', statusF=''){
  const tbody = document.getElementById('quoteTbody');
  if(!tbody) return;
  const f = filter.toLowerCase();
  const rows = quotations
    .map((q, idx)=>({q, idx}))
    .filter(({q}) => {
      if(f && !(q.id+q.customer+getQuoteStatusText(q.status)).toLowerCase().includes(f)) return false;
      if(statusF && q.status !== statusF) return false;
      return true;
    });
  if(rows.length===0){
    tbody.innerHTML = '    <tr><td colspan="7"><div class="empty-state">' + ICONS.sales + '<div>' + (lang==='en'?'No quotations match your search':'لا توجد عروض سعر مطابقة لبحثك') + '</div></div></td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(({q, idx})=>`
    <tr>
      <td><b>${q.id}</b></td>
      <td>${q.customer}</td>
      <td>${q.date}</td>
      <td style="font-weight:700;color:var(--blue);">${lang==='en' ? q.total.toLocaleString('en',{minimumFractionDigits:2})+' '+RYAL : RYAL+' '+q.total.toLocaleString('en',{minimumFractionDigits:2})}</td>
      <td><span class="pill ${getQuoteStatusPill(q.status)}" onclick="toggleQuoteStatus(${idx})" style="cursor:pointer;">${getQuoteStatusText(q.status)}</span></td>
      <td style="text-align:center;white-space:nowrap;">
        ${q.attachments && q.attachments.length
          ? q.attachments.map((a,i)=>`
            <span style="display:inline-flex;align-items:center;gap:2px;background:var(--surface-2);border-radius:6px;padding:2px 4px;margin:1px;font-size:11px;">
              <span style="cursor:pointer;" onclick="downloadQuoteAttachment(${idx},${i})" title="${lang==='en'?'Download':'تحميل'} ${escapeHtml(a.name)}">📎</span>
              <span style="max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(a.name)}</span>
              <span onclick="deleteQuoteAttachment(${idx},${i})" style="cursor:pointer;color:var(--red);font-size:12px;padding:0 2px;" title="${lang==='en'?'Delete':'حذف'}">✕</span>
            </span>
          `).join('')
          : `<span style="color:var(--text-3);font-size:11px;">—</span>`}
        <button class="btn-icon-sm" onclick="uploadQuoteAttachment(${idx})" title="${lang==='en'?'Upload file':'رفع ملف'}" style="cursor:pointer;border:none;background:transparent;border-radius:8px;padding:4px;font-size:14px;display:inline-flex;align-items:center;color:var(--blue);">+</button>
      </td>
      <td><div class="row-actions">
        <button title="${lang==='en'?'View/Print':'عرض/طباعة'}" onclick="openQuoteView(${idx})">${ICONS.eye}</button>
        <button title="${lang==='en'?'Edit':'تعديل'}" onclick="openQuoteModal(${idx})">${ICONS.edit}</button>
        <button title="${lang==='en'?'Delete':'حذف'}" onclick="deleteQuote(${idx})">${ICONS.trash}</button>
      </div></td>
    </tr>
  `).join('');
}

function renderSales(){
  const L = STR[lang];
  const totalQuotes = quotations.length;
  const approvedQuotes = quotations.filter(q=>q.status==='approved').length;
  const reviewQuotes = quotations.filter(q=>q.status==='review').length;
  return `
  <div class="kpi-strip">
    ${statCard(ICONS.sales,'var(--blue)','var(--blue-soft)',lang==='en'?'Total Quotations':'إجمالي عروض الأسعار',String(totalQuotes),'+0', true)}
    ${statCard(ICONS.flag,'var(--green)','var(--green-soft)',lang==='en'?'Approved':'معتمد',String(approvedQuotes),'+0', true)}
    ${statCard(ICONS.issue,'var(--amber)','var(--amber-soft)',lang==='en'?'Under Review':'قيد المراجعة',String(reviewQuotes),'+0', true)}
  </div>
  <div class="toolbar">
    <button class="btn btn-primary" id="newQuoteBtn">${ICONS.plus}${lang==='en'?'New Quotation':'عرض سعر جديد'}</button>
    <button class="btn" id="quoteFilterBtn">${ICONS.filter}${L.toolbar.filter}</button>
    <div class="table-search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      <input id="quoteSearch" placeholder="${lang==='en'?'Search by ID, customer or status...':'ابحث بالرقم، العميل أو الحالة...'}">
    </div>
  </div>
  <div class="filter-panel" id="quoteFilterPanel">
    <div class="field">
      <label>${lang==='en'?'Status':'الحالة'}</label>
      <select id="quoteFilterStatus">
        <option value="">${lang==='en'?'All':'الكل'}</option>
        <option value="review">${lang==='en'?'Under Review':'تحت المراجعة'}</option>
        <option value="approved">${lang==='en'?'Approved':'معتمد'}</option>
        <option value="sent">${lang==='en'?'Sent':'تم الإرسال'}</option>
      </select>
    </div>
    <button class="btn-mini" id="quoteFilterApply">${L.toolbar.applyFilter}</button>
    <button class="btn-mini" id="quoteFilterReset" style="background:var(--surface-2);color:var(--text);">${L.toolbar.resetFilter}</button>
  </div>
  <div class="table-card">
    <table>
      <thead><tr>
        <th>${lang==='en'?'Quote #':'رقم العرض'}</th>
        <th>${lang==='en'?'Customer':'العميل'}</th>
        <th>${lang==='en'?'Date':'التاريخ'}</th>
        <th>${lang==='en'?'Total Amount':'الإجمالي'}</th>
        <th>${lang==='en'?'Status':'الحالة'}</th>
        <th style="text-align:center;">📎 ${lang==='en'?'Files':'الملفات'}</th>
        <th>${L.table.actions}</th>
      </tr></thead>
      <tbody id="quoteTbody"></tbody>
    </table>
  </div>`;
};

let quoteLines = [];
let editingQuoteIdx = null;

function openQuoteModal(idx=null){
  editingQuoteIdx = idx;
  const isEdit = idx !== null;
  const q = isEdit ? quotations[idx] : null;
  
  // Create Modal HTML
  const modalHTML = `
  <div class="modal-overlay show" id="quoteModalOverlay" style="z-index:2000;">
    <div class="modal modal-xl" style="max-width:95vw; width:95vw; max-height:95vh; overflow-y:auto; margin:20px auto;">
      <h3 style="margin-bottom:15px;">${isEdit ? (lang==='en'?'Edit Quotation':'تعديل عرض سعر') : (lang==='en'?'New Quotation':'عرض سعر جديد')}</h3>
      <div class="field-row">
        <div class="field">
          <label>${lang==='en'?'Quote Number (AIF-F...)':'رقم العرض (AIF-F...)'}</label>
          <div style="display:flex;align-items:center;gap:5px;">
            <span style="font-weight:700;color:var(--text-2);">AIF-F</span>
            <input id="qIdSuffix" style="flex:1;" placeholder="25-19" value="${isEdit ? q.id.replace('AIF-F','') : ''}">
          </div>
        </div>
        <div class="field">
          <label>${lang==='en'?'Customer Name':'اسم العميل'}</label>
          <input id="qCustomer" placeholder="${lang==='en'?'Enter customer name...':'أدخل اسم الشركة...'}" value="${isEdit ? q.customer : ''}">
        </div>
        <div class="field">
          <label>${lang==='en'?'Date':'التاريخ'}</label>
          <input type="date" id="qDate" value="${isEdit ? q.date : new Date().toISOString().split('T')[0]}">
        </div>
        <div class="field">
          <label>${lang==='en'?'Status':'الحالة'}</label>
          <select id="qStatus">
            <option value="review" ${isEdit&&q.status==='review'?'selected':''}>${lang==='en'?'Under Review':'تحت المراجعة'}</option>
            <option value="approved" ${isEdit&&q.status==='approved'?'selected':''}>${lang==='en'?'Approved':'معتمد'}</option>
            <option value="sent" ${isEdit&&q.status==='sent'?'selected':''}>${lang==='en'?'Sent':'تم الإرسال'}</option>
          </select>
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>${lang==='en'?'Phone':'رقم الجوال'}</label>
          <input id="qPhone" placeholder="05XXXXXXXX" value="${isEdit&&q.phone?q.phone:'0546342735'}">
        </div>
        <div class="field">
          <label>${lang==='en'?'E-mail':'البريد الإلكتروني'}</label>
          <input id="qEmail" placeholder="info@..." value="${isEdit&&q.email?q.email:'info@elbraq.com'}">
        </div>
        <div class="field">
          <label>${lang==='en'?'Address':'الموقع'}</label>
          <input id="qAddress" placeholder="${lang==='en'?'City, Street':'المدينة، الشارع'}" value="${isEdit&&q.address?q.address:'الرياض، المملكة العربية السعودية'}">
        </div>
      </div>
      <div class="field-row">
        <div class="field">
          <label>${lang==='en'?'Validity (days)':'مدة العرض (أيام)'}</label>
          <select id="qValidity">
            ${[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(d => `<option value="${d}" ${isEdit&&q.validity==d?'selected':d===15?'selected':''}>${d}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label>${lang==='en'?'Salesperson':'المندوب'}</label>
          <select id="qSalesperson">
            <option value="محمد علي" ${isEdit&&q.salesperson==='محمد علي'?'selected':''}>محمد علي</option>
            <option value="عبدالباسط" ${isEdit&&q.salesperson==='عبدالباسط'?'selected':''}>عبدالباسط</option>
            <option value="نمر أحمد" ${isEdit&&q.salesperson==='نمر أحمد'?'selected':''}>نمر أحمد</option>
          </select>
        </div>
      </div>
      <div style="margin-top:15px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <label style="font-weight:700;font-size:12px;text-transform:uppercase;">${lang==='en'?'Items':'الأصناف'}</label>
          <button class="btn-mini" onclick="addQuoteLine()">+ ${lang==='en'?'Add Item':'إضافة صنف'}</button>
        </div>
        <table class="po-items-table">
          <thead>
            <tr>
              <th style="width:25%;">${lang==='en'?'Item':'الصنف'}</th>
              <th style="width:35%;">${lang==='en'?'Description':'المواصفات'}</th>
              <th style="width:10%;">${lang==='en'?'Qty':'الكمية'}</th>
              <th style="width:10%;">${lang==='en'?'Unit':'الوحدة'}</th>
              <th style="width:15%;">${lang==='en'?'Price (SAR)':`السعر (${RYAL})`}</th>
              <th style="width:5%;"></th>
            </tr>
          </thead>
          <tbody id="qLinesBody"></tbody>
        </table>
      </div>
      <div class="po-totals">
        <div class="po-totals-row"><span>${lang==='en'?'Subtotal':'الإجمالي قبل الضريبة'}</span><span id="qSubtotal">${RYAL} 0.00</span></div>
        <div class="po-totals-row"><span>${lang==='en'?'VAT (15%)':'ضريبة القيمة المضافة (15%)'}</span><span id="qVat">${RYAL} 0.00</span></div>
        <div class="po-totals-row"><span style="font-weight:800;">${lang==='en'?'Grand Total':'الإجمالي شامل الضريبة'}</span><span id="qGrandTotal" style="font-weight:800;color:var(--blue);">${RYAL} 0.00</span></div>
      </div>
      <div class="field" style="margin-top:15px;">
        <label>${lang==='en'?'Terms & Conditions':'الشروط والأحكام'}</label>
        <textarea id="qTerms" rows="4" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--input-bg,var(--surface));color:var(--text);font-family:inherit;font-size:13px;resize:vertical;">${isEdit && q.terms ? q.terms : 'الأسعار تشمل ضريبة القيمة المضافة.\nالتسليم خلال 3 إلى 7 أيام من تاريخ تأكيد الطلب.\nالدفع مقدماً أو حسب الاتفاق.\nهذا العرض لا يعتبر عقداً ملزماً.\nفي حال استلامكم هذا العرض، نأمل التكرم بتوقيع وختم الموافقة.'}</textarea>
      </div>
      <div class="field" style="margin-top:10px;">
        <label>${lang==='en'?'Payments':'الدفعات'}</label>
        <textarea id="qPayments" rows="3" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--input-bg,var(--surface));color:var(--text);font-family:inherit;font-size:13px;resize:vertical;">${isEdit && q.payments ? q.payments : ''}</textarea>
      </div>
      <div class="modal-actions">
        <button class="btn" onclick="closeQuoteModal()">${STR[lang].modal.cancel}</button>
        <button class="btn btn-primary" onclick="saveQuotation()">${STR[lang].modal.save}</button>
      </div>
    </div>
  </div>`;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  quoteLines = isEdit ? JSON.parse(JSON.stringify(q.items)) : [];
  if(quoteLines.length === 0) addQuoteLine();
  renderQuoteLines();
}

function closeQuoteModal(){
  const el = document.getElementById('quoteModalOverlay');
  if(el) el.remove();
}

function addQuoteLine(){
  quoteLines.push({name:'', desc:'', qty:1, unit:'طن', price:0});
  renderQuoteLines();
}

function removeQuoteLine(idx){
  if(quoteLines.length <= 1){ showToast(lang==='en'?'At least one item is required':'يجب وجود صنف واحد على الأقل'); return; }
  quoteLines.splice(idx, 1);
  renderQuoteLines();
  updateQuoteTotals();
}

function renderQuoteLines(){
  const body = document.getElementById('qLinesBody');
  if(!body) return;
  body.innerHTML = quoteLines.map((l, idx)=>`
    <tr>
      <td><input value="${l.name}" oninput="quoteLines[${idx}].name=this.value" placeholder="${lang==='en'?'Item name':'اسم الصنف'}"></td>
      <td><input value="${l.desc}" oninput="quoteLines[${idx}].desc=this.value" placeholder="${lang==='en'?'Specifications':'المواصفات'}"></td>
      <td><input type="number" value="${l.qty}" oninput="quoteLines[${idx}].qty=parseFloat(this.value)||0; updateQuoteTotals()" style="text-align:center;"></td>
      <td><input value="${l.unit}" oninput="quoteLines[${idx}].unit=this.value" style="text-align:center;"></td>
      <td><span style="font-weight:700;color:var(--text-2);margin-inline-end:4px;">${RYAL}</span><input type="number" value="${l.price}" oninput="quoteLines[${idx}].price=parseFloat(this.value)||0; updateQuoteTotals()" style="text-align:end;width:80px;"></td>
      <td><button onclick="removeQuoteLine(${idx})" style="width:28px;height:28px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:var(--red);cursor:pointer;display:flex;align-items:center;justify-content:center;" title="${lang==='en'?'Delete item':'حذف الصنف'}">${ICONS.trash}</button></td>
    </tr>
  `).join('');
  updateQuoteTotals();
}

function updateQuoteTotals(){
  const subtotal = quoteLines.reduce((s, l)=> s + (l.qty * l.price), 0);
  const vat = subtotal * 0.15;
  const total = subtotal + vat;
  const fmt = n => n.toLocaleString('en',{minimumFractionDigits:2});
  document.getElementById('qSubtotal').innerHTML = lang==='en' ? fmt(subtotal)+' '+RYAL : RYAL+' '+fmt(subtotal);
  document.getElementById('qVat').innerHTML = lang==='en' ? fmt(vat)+' '+RYAL : RYAL+' '+fmt(vat);
  document.getElementById('qGrandTotal').innerHTML = lang==='en' ? fmt(total)+' '+RYAL : RYAL+' '+fmt(total);
}

function getTermsForDisplay(termsText){
  if(!termsText) return [];
  return termsText.split('\n').filter(t => t.trim()).map(t => t.trim());
}

function savePaymentsText(idx, text){
  if(quotations[idx]){
    quotations[idx].payments = text.trim();
  }
}

function saveQuotation(){
  const suffix = document.getElementById('qIdSuffix').value.trim();
  const customer = document.getElementById('qCustomer').value.trim();
  const date = document.getElementById('qDate').value;
  const terms = document.getElementById('qTerms').value.trim();
  const payments = document.getElementById('qPayments') ? document.getElementById('qPayments').value.trim() : '';
  const phone = document.getElementById('qPhone') ? document.getElementById('qPhone').value.trim() : '';
  const email = document.getElementById('qEmail') ? document.getElementById('qEmail').value.trim() : '';
  const address = document.getElementById('qAddress') ? document.getElementById('qAddress').value.trim() : '';
  const validity = parseInt(document.getElementById('qValidity') ? document.getElementById('qValidity').value : 15) || 15;
  const salesperson = document.getElementById('qSalesperson') ? document.getElementById('qSalesperson').value : 'محمد علي';
  
  if(!suffix || !customer){
    showToast(lang==='en'?'Please fill all fields':'يرجى ملء جميع الحقول');
    return;
  }
  
  const subtotal = quoteLines.reduce((s, l)=> s + (l.qty * l.price), 0);
  const vat = subtotal * 0.15;
  
  const status = document.getElementById('qStatus') ? document.getElementById('qStatus').value : 'review';
  
  const q = {
    id: 'AIF-F' + suffix,
    customer,
    date,
    phone,
    email,
    address,
    validity,
    salesperson,
    status,
    total: subtotal + vat,
    terms: terms || 'الأسعار تشمل ضريبة القيمة المضافة.\nالتسليم خلال 3 إلى 7 أيام من تاريخ تأكيد الطلب.\nالدفع مقدماً أو حسب الاتفاق.\nهذا العرض لا يعتبر عقداً ملزماً.\nفي حال استلامكم هذا العرض، نأمل التكرم بتوقيع وختم الموافقة.',
    payments,
    items: JSON.parse(JSON.stringify(quoteLines)),
    attachments: editingQuoteIdx !== null && quotations[editingQuoteIdx]?.attachments
      ? JSON.parse(JSON.stringify(quotations[editingQuoteIdx].attachments))
      : []
  };
  
  if(editingQuoteIdx !== null){
    quotations[editingQuoteIdx] = q;
  } else {
    quotations.unshift(q);
  }
  
  closeQuoteModal();
  navigate('sales');
  showToast(lang==='en'?'Quotation saved!':'تم حفظ عرض السعر!');
}

async function deleteQuote(idx){
  const ok = await showConfirm(lang==='en'?'Are you sure you want to delete this quote?':'هل أنت متأكد من حذف هذا العرض؟');
  if(ok){
    quotations.splice(idx, 1);
    navigate('sales');
  }
}

function downloadQuoteAttachment(quoteIdx, attachIdx){
  const q = quotations[quoteIdx];
  if(!q || !q.attachments || !q.attachments[attachIdx]) return;
  const a = q.attachments[attachIdx];
  const link = document.createElement('a');
  link.href = a.data;
  link.download = a.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadAllQuoteAttachments(quoteIdx){
  const q = quotations[quoteIdx];
  if(!q || !q.attachments) return;
  q.attachments.forEach((a,i)=> downloadQuoteAttachment(quoteIdx, i));
}

async function deleteQuoteAttachment(quoteIdx, attachIdx){
  const ok = await showConfirm(lang==='en'?'Delete this attachment?':'حذف هذا المرفق؟');
  if(!ok) return;
  const q = quotations[quoteIdx];
  if(!q || !q.attachments) return;
  q.attachments.splice(attachIdx, 1);
  navigate('sales');
  showToast(lang==='en'?'Attachment deleted!':'تم حذف المرفق!');
}

let _uploadQuoteIdx = null;
function uploadQuoteAttachment(quoteIdx){
  _uploadQuoteIdx = quoteIdx;
  let input = document.getElementById('_quoteUploadInput');
  if(!input){
    input = document.createElement('input');
    input.type = 'file';
    input.id = '_quoteUploadInput';
    input.multiple = true;
    input.style.display = 'none';
    input.addEventListener('change', function(){
      const idx = _uploadQuoteIdx;
      if(idx === null || !quotations[idx]) return;
      const files = Array.from(this.files);
      files.forEach(f=>{
        if(f.size > 10*1024*1024){ showToast(lang==='en'?'File too large (max 10MB)':'الملف كبير جداً (الحد الأقصى 10 ميجابايت)'); return; }
        const reader = new FileReader();
        reader.onload = function(e){
          if(!quotations[idx].attachments) quotations[idx].attachments = [];
          quotations[idx].attachments.push({name: f.name, data: e.target.result, type: f.type});
          navigate('sales');
          showToast(lang==='en'?'File uploaded!':'تم رفع الملف!');
        };
        reader.readAsDataURL(f);
      });
      this.value = '';
      _uploadQuoteIdx = null;
    });
    document.body.appendChild(input);
  }
  input.click();
}

function openQuoteView(idx){
  const q = quotations[idx];
  const isAr = lang === 'ar';
  const L = STR[lang];
  const dir = isAr ? 'rtl' : 'ltr';
  const al = isAr ? 'right' : 'left';
  const alOpp = isAr ? 'left' : 'right';
  const flexEnd = isAr ? 'flex-end' : 'flex-start';
  
  const viewHTML = `
  <div class="modal-overlay show" id="quoteViewOverlay" style="background:rgba(0,0,0,0.85);">
    <div class="modal modal-xl" style="padding:0; overflow:auto; background:#fff; border-radius:0; width:95%; max-width:210mm; min-height:auto; height:auto; margin:10px auto; position:relative; box-shadow:0 0 50px rgba(0,0,0,0.5); transform-origin:top center;">
      <!-- Actions Bar (Hidden during print) -->
      <div class="po-print-actions" style="position:fixed; top:20px; inset-inline-end:20px; z-index:1000; display:flex; gap:10px;">
        <button class="btn" onclick="document.getElementById('quoteViewOverlay').remove()" style="background:#fff;">✕ ${L.notif.viewAll||(isAr?'إغلاق':'Close')}</button>
        ${q.attachments && q.attachments.length ? `<button class="btn" onclick="downloadAllQuoteAttachments(${idx})" style="background:#fff;">📎 ${isAr?'تحميل المرفقات':'Download Attachments'} (${q.attachments.length})</button>` : ''}
        <button class="btn btn-primary" onclick="printQuotation(${idx})">🖨 ${isAr?'حفظ PDF / طباعة':'Save PDF / Print'}</button>
      </div>
      
      <!-- QUOTATION DOCUMENT START -->
      <div id="printableQuote" style="padding:30px 30px 140px; font-family:'Tajawal','Inter',sans-serif; color:#1a1a1a; direction:${dir}; text-align:${al}; background:#fff; position:relative; min-height:297mm;">
        
        <!-- Header Section -->
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:25px; border-bottom:3px solid #1a237e; padding-bottom:12px;">
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:65px; height:65px; background:#fff; border:2px solid #1a237e; border-radius:12px; display:flex; align-items:center; justify-content:center; padding:4px;">
               <img src="data:image/png;base64,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jFWwxtSpD7NdZeKj9GuUDg/13YpXBh1ERES/DpEf56AtERHRh3YXGtRtKDHGrRA0xlhLQmtpaIw3IceCaVwwDCMuw4TLZcQwjCXouIy4DOXju4mOcUaGRM7XK6X71bPlStt2lhJ4pG1DS0418EC+m/L4fpqjuAs2cLP15M1d3m5BUWU17noHEoAIgQggloCjHksx5qYAdJ3KCK5sOfEOIbjao1GPr1gNbWqPRi0jVdt1LSotX5fcvkas3wcRERH9MhhwEBERPaiUUu3UmDHPC8ZpxuUy4HIZb+4jhmG4Bh7jhLFOc4zTXIMNBUAhZ1W2saSMVO8xrptX1vWyqXx+XTW7TXVcLwBbeenb/5txd9REvBNoyLoRRUqo260oeg0cJJAXAEsNOJabcKMEF7fTGt6XcKMJ11WuZYrDbsdXlFJbgMGpDCIiosfFIypEREQPqx5pUWprpcg5Q4gyiWCtRfAO4+QxjTPGacY8r/0bc+3gkMiQQJ3gKOtm07ZuNtaJkXTz8V3gkUtPyO00x7qR5U+/avHexEYNN262kaj1rhX0TchxPaISASQYrcoURi0avT1mUno4akGoLfd10uP2yAmnMoiIiB4fAw4iIqIHJQQgpIRS5YO1v6KEGwZ+XrAsC+YlYlkWLPNSNrUssRxxWRKA0r2BLJAh6+cSlhgRlzXouP757YhMKqFHyt9Pcrw9pnL/ReOmY+M23FhXrIqb4yHliMh1Q4qG0hJCZAjk7X79sxJSyW19q1lXuZry7+ra1VGCEgWt5fZ3l/+eDDeIiIgeGY+oEBERPahS9pnuOjvKEZIaPqTrsZL1+XxzvCTlVIMN1M0pYgtAbq+4PleDjm2iY3vt62vibenoGwKAkAJSyLuAY53ckGrtwaj9FzXYMKaEFcaoerzlekkh350GWcOL9XXV9vE6PXLfqQEw5CAiInpkDDiIiIg+sWtnRrkvy4J5jvW+1GBjuQs74jbVkW4ClLWANH/3mrfuJjfE2+mNa6ih13td/7pdWjOcICIionfxiAoREdEnJoSovR1i6+9QKgNQAFBChyihVULU8WZqIyHFfD2iUidI7iY33pniWMtF74+pyLupi3LURN13cGgFJdfOjPI6b78PIiIi+twYcBAREREAbJMVOV87KZTKSEndH3HJa+fGejzmuuL2Wr3x5x0cZT3s7UaV29LRa9Ah1sDj5ojJ2y0s69dJRERExCMqREREBOAaUtwGFlu/x+0a2NtAA7fHXICbeONP1Vhim8J4u8Xk7RrZ240rb9e4MtwgIiKiFQMOIiIi+lO3ocW/Q3x3HIWIiIjoPTyiQkRERH+qhAtMGIiIiOjXJ//tL4CIiIiIiIiI6J9iwEFERERERERED48BBxERERERERE9PAYcRERERERERPTwGHAQERERERER0cNjwEFERERERERED48BBxERERERERE9PAYcRERERERERPTwGHAQERERERER0cNjwEFERERERERED48BBxERERERERE9PAYcRERERERERPTwGHAQERERERER0cNjwEFERERERERED48BBxERERERERE9PAYcRERERERERPTwGHAQERERERER0cP7P4PfcOk5D8lGAAAAAElFTkSuQmCC" style="width:100%; height:100%; object-fit:contain;">
            </div>
            <div>
              <div style="font-size:20px; font-weight:800; color:#1a237e;">${isAr?'مصنع أبو ظهير للحديد':'Abu Duhair Iron Factory'}</div>
              <div style="font-size:15px; font-weight:700; color:#d32f2f;">${isAr?'Abu Duhair Iron Factory':'Abu Duhair Iron Factory'}</div>
              <div style="font-size:11px; color:#666; margin-top:3px;">${isAr?'رقم الضريبة VAT No: 301341765600003':'VAT No: 301341765600003'}</div>
            </div>
          </div>
          
          <div style="text-align:center;">
            <span style="font-size:36px; font-weight:900; color:#1a237e; letter-spacing:2px;">${isAr?'عرض سعر':'QUOTATION'}</span>
          </div>
          
          <div style="position:absolute; top:0; inset-inline-start:40%; transform:translateX(-50%); width:0; height:0; border-left:80px solid transparent; border-right:80px solid transparent; border-top:120px solid #d32f2f; opacity:0.08; z-index:0;"></div>
        </div>

        <!-- Info Grid -->
        <div style="display:grid; grid-template-columns: 1fr 1.1fr; gap:12px; margin-bottom:12px; position:relative; z-index:1;">
          <!-- Left: Quote Details -->
          <div style="background:#f8f9fa; padding:10px 12px; border-radius:8px; border-inline-start:4px solid #1a237e;">
            <div style="display:flex; margin-bottom:4px; align-items:center;">
              <span style="width:95px; font-weight:700; color:#1a237e; font-size:12px;">${isAr?'رقم العرض:':'Quote #:'}</span>
              <span style="font-weight:800; font-size:14px;">${q.id}</span>
            </div>
            <div style="display:flex; margin-bottom:4px; align-items:center;">
              <span style="width:95px; font-weight:700; color:#1a237e; font-size:12px;">${isAr?'تاريخ العرض:':'Date:'}</span>
              <span style="font-size:12px;">${isAr ? q.date.split('-').reverse().join(' / ') : q.date}</span>
            </div>
            <div style="display:flex; margin-bottom:4px; align-items:center;">
              <span style="width:95px; font-weight:700; color:#1a237e; font-size:12px;">${isAr?'صلاحية العرض:':'Validity:'}</span>
              <span style="font-size:12px;">${q.validity || 15} ${isAr?'يوم من تاريخ الإصدار':'days from issue date'}</span>
            </div>
            <div style="display:flex; align-items:center;">
              <span style="width:95px; font-weight:700; color:#1a237e; font-size:12px;">${isAr?'المبيعات:':'Salesperson:'}</span>
              <span style="font-size:12px;">${q.salesperson || (isAr?'محمد علي':'Mohammed Ali')}</span>
            </div>
          </div>
          
          <!-- Right: Customer Details -->
          <div style="text-align:${alOpp}; direction:${isAr?'ltr':'rtl'}; padding:6px 8px;">
            <div style="font-size:12px; color:#d32f2f; font-weight:700; margin-bottom:3px; text-align:${al}; direction:${dir};">${isAr?'إلى السادة /':'To:'}</div>
            <div style="font-size:18px; font-weight:900; color:#1a237e; margin-bottom:4px; text-align:${al}; direction:${dir};">${q.customer}</div>
            <div style="font-size:12px; color:#666; margin-bottom:5px; text-align:${al}; direction:${dir};">${q.address || (isAr?'المملكة العربية السعودية - الرياض':'Riyadh, Saudi Arabia')}</div>
            <div style="display:flex; align-items:center; gap:6px; font-size:12px; text-align:${al}; direction:${dir};">
              <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="10" fill="#1a237e"/><path d="M8 7h8c1.1 0 1.5.5 1.5 1v8c0 .5-.4 1-1.5 1H8c-1.1 0-1.5-.5-1.5-1V8c0-.5.4-1 1.5-1z" fill="none" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M10.5 8.5h3" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/><path d="M10.5 15.5h3" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg>
              <span>${q.phone || '+966 54 634 2735'}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px; font-size:12px; text-align:${al}; direction:${dir};">
              <svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="10" fill="#1a237e"/><rect x="7" y="7.5" width="10" height="9" rx="1.5" fill="none" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M7 7.5l5 4.5 5-4.5" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span>${q.email || 'info@elbraq.com'}</span>
            </div>
          </div>
        </div>

        <div style="margin-bottom:8px; font-weight:700; color:#1a237e; font-size:13px;">
           ${isAr?'ننتقدم لكم بعرضنا لسعر المواد الحديدية وفقاً للمواصفات والكميات الموضحة أدناه:':'We present our quotation for iron materials as per specifications and quantities below:'}
        </div>

        <!-- Items Table -->
        <table style="width:100%; border-collapse:collapse; margin-bottom:15px; font-size:12px;">
          <thead>
            <tr style="background:#1a237e; color:#fff;">
              <th style="padding:8px; border:1px solid #1a237e; width:35px;">${isAr?'م':'#'}</th>
              <th style="padding:8px; border:1px solid #1a237e;">${isAr?'الصنف':'Item'}</th>
              <th style="padding:8px; border:1px solid #1a237e;">${isAr?'المواصفات':'Description'}</th>
              <th style="padding:8px; border:1px solid #1a237e; width:55px;">${isAr?'الوحدة':'Unit'}</th>
              <th style="padding:8px; border:1px solid #1a237e; width:55px;">${isAr?'الكمية':'Qty'}</th>
              <th style="padding:8px; border:1px solid #1a237e; width:90px;">${isAr?`سعر الوحدة (${RYAL})`:'Unit Price'}</th>
              <th style="padding:8px; border:1px solid #1a237e; width:105px;">${isAr?`الإجمالي (${RYAL})`:'Total'}</th>
            </tr>
          </thead>
          <tbody>
            ${q.items.map((it, i)=>`
              <tr style="background:${i%2===0?'#fff':'#f8f9fa'};">
                <td style="padding:7px 6px; border:1px solid #e0e0e0; text-align:center; font-weight:700; background:#1a237e; color:#fff;">${i+1}</td>
                <td style="padding:7px 8px; border:1px solid #e0e0e0; font-weight:700;">${it.name}</td>
                <td style="padding:7px 8px; border:1px solid #e0e0e0; color:#555;">${it.desc}</td>
                <td style="padding:7px 6px; border:1px solid #e0e0e0; text-align:center;">${it.unit}</td>
                <td style="padding:7px 6px; border:1px solid #e0e0e0; text-align:center; font-weight:700;">${it.qty}</td>
                <td style="padding:7px 6px; border:1px solid #e0e0e0; text-align:center;">${it.price.toLocaleString('en',{minimumFractionDigits:2})}</td>
                <td style="padding:7px 6px; border:1px solid #e0e0e0; text-align:center; font-weight:800; color:#1a237e;">${(it.qty*it.price).toLocaleString('en',{minimumFractionDigits:2})}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals -->
        <div style="margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; padding:6px 8px; border-bottom:1px solid #eee; max-width:350px;">
            <span style="font-weight:700; color:#1a237e; font-size:12px;">${isAr?'الإجمالي قبل الضريبة':'Subtotal'}</span>
            <span style="font-weight:800; font-size:12px;">${isAr ? spanBig(RYAL)+' '+(q.total/1.15).toLocaleString('en',{minimumFractionDigits:2}) : (q.total/1.15).toLocaleString('en',{minimumFractionDigits:2})+' '+spanBig(RYAL)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:6px 8px; border-bottom:1px solid #eee; max-width:350px;">
            <span style="font-weight:700; color:#1a237e; font-size:12px;">${isAr?'ضريبة القيمة المضافة (15%)':'VAT (15%)'}</span>
            <span style="font-weight:800; font-size:12px;">${isAr ? spanBig(RYAL)+' '+(q.total - q.total/1.15).toLocaleString('en',{minimumFractionDigits:2}) : (q.total - q.total/1.15).toLocaleString('en',{minimumFractionDigits:2})+' '+spanBig(RYAL)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 8px; background:#f0f2f5; border-radius:6px; margin-top:3px; max-width:350px;">
            <span style="font-weight:900; color:#d32f2f; font-size:14px;">${isAr?'الإجمالي شامل الضريبة':'Total (incl. VAT)'}</span>
            <span style="font-weight:900; color:#1a237e; font-size:15px;">${isAr ? spanBig(RYAL)+' '+q.total.toLocaleString('en',{minimumFractionDigits:2}) : q.total.toLocaleString('en',{minimumFractionDigits:2})+' '+spanBig(RYAL)}</span>
          </div>
        </div>

        <!-- Payments -->
        <div style="background:#f8f9fa; border:1px solid #e0e0e0; border-radius:8px; padding:10px 12px; margin-bottom:15px;">
          <div style="font-weight:900; color:#d32f2f; border-bottom:2px solid #d32f2f; display:inline-block; margin-bottom:6px; padding-bottom:2px; font-size:13px;">${isAr?'الدفعات :':'Payments:'}</div>
          <div id="quotePaymentsDisplay" contenteditable="true" style="font-size:11px; color:#444; line-height:1.5; white-space:pre-wrap; padding:4px; border:1px dashed #ccc; border-radius:4px; min-height:24px;" onblur="savePaymentsText(${idx}, this.innerText)">${q.payments || (isAr?'(نص الدفعات)':'(Payment terms)')}</div>
        </div>

        <!-- Terms -->
        <div style="background:#f8f9fa; border:1px solid #e0e0e0; border-radius:8px; padding:10px 12px; margin-bottom:15px;">
          <div style="font-weight:900; color:#d32f2f; border-bottom:2px solid #d32f2f; display:inline-block; margin-bottom:6px; padding-bottom:2px; font-size:13px;">${isAr?'الشروط والأحكام :':'Terms & Conditions:'}</div>
          <ul style="margin:0; padding-inline-start:18px; font-size:11px; color:#444; line-height:1.5;">
            ${getTermsForDisplay(q.terms).map(t => `<li style="margin-bottom:2px;">${t}</li>`).join('')}
          </ul>
        </div>

        <!-- Signature -->
        <div style="display:flex; flex-direction:column; align-items:flex-end; margin-top:8px;">
           <div style="font-size:11px; font-weight:700; color:#666; margin-bottom:30px;">${isAr?'توقيع العميل (الموافقة)':'Customer Signature (Approval)'}</div>
           <div style="width:120px; border-bottom:1px solid #ccc;"></div>
        </div>

        <!-- Footer (Fixed at bottom of A4) -->
        <div style="position:absolute; bottom:30px; left:30px; right:30px; border-top:2px solid #1a237e; padding-top:12px; display:flex; justify-content:space-between; align-items:flex-end; font-size:10px; color:#666;">
              <div style="display:flex; flex-direction:column; gap:4px;">
              <div style="display:flex; align-items:center; gap:4px;"><span>0144290444</span><svg viewBox="0 0 24 24" width="13" height="13"><circle cx="12" cy="12" r="10" fill="#1a237e"/><path d="M8 7h8c1.1 0 1.5.5 1.5 1v8c0 .5-.4 1-1.5 1H8c-1.1 0-1.5-.5-1.5-1V8c0-.5.4-1 1.5-1z" fill="none" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M10.5 8.5h3" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/><path d="M10.5 15.5h3" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg></div>
              <div style="display:flex; align-items:center; gap:4px;"><span>info@abuduhair.com.sa</span><svg viewBox="0 0 24 24" width="13" height="13"><circle cx="12" cy="12" r="10" fill="#1a237e"/><rect x="7" y="7.5" width="10" height="9" rx="1.5" fill="none" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><path d="M7 7.5l5 4.5 5-4.5" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
              <div style="display:flex; align-items:center; gap:4px;"><span>www.abuduhair.com.sa</span><svg viewBox="0 0 24 24" width="13" height="13"><circle cx="12" cy="12" r="10" fill="#1a237e"/><circle cx="12" cy="12" r="5" fill="none" stroke="#fff" stroke-width="1.5"/><path d="M12 7c-2 2.5-2 7.5 0 10" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/><path d="M7 12h10" fill="none" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/></svg></div>
            </div>
           
           <div style="text-align:center;">
             <div style="font-weight:700; color:#1a237e; font-size:11px;">${isAr?'المملكة العربية السعودية':'Saudi Arabia'}</div>
             <div>${isAr?'المنطقة الشمالية - تبوك':'Tabuk, Northern Region'}</div>
             <div>${isAr?'المدينة الصناعية':'Industrial City'}</div>
           </div>
           
           <div style="text-align:${alOpp}; direction:${isAr?'ltr':'rtl'};">
             <div style="font-weight:700; color:#1a237e; margin-bottom:3px; text-align:${al}; direction:${dir}; font-size:11px;">${isAr?'الحساب البنكي':'Bank Account'}</div>
             <div style="display:flex; align-items:center; gap:8px; background:#fff; padding:4px 6px; border:1px solid #eee; border-radius:4px;">
               <div style="font-weight:800; font-size:9px;">SNB</div>
               <div style="font-size:9px;">${isAr?'مصنع أبوظهير للحديد':'Abu Duhair Iron Factory'}</div>
             </div>
             <div style="font-size:9px; margin-top:2px; font-weight:700;">SA90 1000 0074 1000 0238 8410</div>
           </div>
        </div>
      </div>
      <!-- QUOTATION DOCUMENT END -->
      
    </div>
  </div>
  <style>
    @media print {
      body > *:not(#quoteViewOverlay) { display: none !important; visibility: hidden !important; }
      #quoteViewOverlay { 
        display: block !important; 
        visibility: visible !important; 
        position: static !important; 
        background: white !important; 
        width: 100% !important; 
        height: auto !important; 
        margin: 0 !important; 
        padding: 0 !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }
      .modal-overlay { 
        display: block !important; 
        visibility: visible !important; 
        position: static !important; 
        background: white !important; 
        width: 100% !important; 
        height: auto !important; 
      }
      .modal { 
        display: block !important; 
        visibility: visible !important; 
        box-shadow: none !important; 
        margin: 0 !important; 
        width: 100% !important; 
        max-width: 100% !important; 
        border: none !important; 
        padding: 0 !important; 
        background: white !important;
        overflow: visible !important;
      }
      #printableQuote { 
        visibility: visible !important; 
        position: relative !important; 
        width: 210mm !important; 
        padding: 30px 30px 140px !important; 
        margin: 0 auto !important;
        background: white !important;
        color: black !important;
      }
      #printableQuote > div:last-child { 
        position: fixed !important; 
        bottom: 0 !important; 
        left: 30px !important; 
        right: 30px !important; 
        background: white !important;
      }
      #printableQuote * { 
        visibility: visible !important; 
      }
      .po-print-actions { 
        display: none !important; 
        visibility: hidden !important;
      }
      .po-doc-header, .po-total-final { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
      }
    }
    @page {
      size: A4;
      margin: 0;
    }
  </style>`;
  
  document.body.insertAdjacentHTML('beforeend', viewHTML);
}

function printQuotation(idx){
  const q = quotations[idx];
  if(!q) return;
  const originalTitle = document.title;
  const fileName = `QUOTE-R.F.Q-${q.id}-Rev.001-${q.customer}`;
  document.title = fileName;
  setTimeout(() => {
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 500);
  }, 100);
}

function renderInventory(){
  const L = STR[lang];
  return `
  <div class="toolbar">
    <button class="btn btn-primary" id="addItemBtn">${ICONS.plus}${L.toolbar.addItem}</button>
    <button class="btn" id="invFilterBtn">${ICONS.filter}${L.toolbar.filter}</button>
    <button class="btn" id="invExportBtn">${ICONS.download}${L.toolbar.export}</button>
    <div class="table-search">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      <input id="invSearch" placeholder="${L.toolbar.search}">
    </div>
  </div>
  <div class="filter-panel" id="invFilterPanel">
    <div class="field">
      <label>${L.toolbar.filterStatus}</label>
      <select id="invFilterStatus">
        <option value="">${L.toolbar.filterAll}</option>
        <option value="inStock">${L.table.inStock}</option>
        <option value="lowStock">${L.table.lowStock}</option>
        <option value="critical">${L.table.critical}</option>
      </select>
    </div>
    <div class="field">
      <label>${L.toolbar.filterCat}</label>
      <select id="invFilterCat">
        <option value="">${L.toolbar.filterAll}</option>
        <option>Pumps &amp; Motors</option>
        <option>Automation</option>
        <option>Tools</option>
        <option>Bearings</option>
        <option>Raw Materials</option>
      </select>
    </div>
    <button class="btn-mini" id="invFilterApply">${L.toolbar.applyFilter}</button>
    <button class="btn-mini" id="invFilterReset" style="background:var(--surface-2);color:var(--text);">${L.toolbar.resetFilter}</button>
  </div>
  <div class="table-card">
    <table>
      <thead><tr>
        <th>${L.table.item}</th><th>${L.table.sku}</th><th>${L.table.category}</th>
        <th>${L.table.stock}</th><th>${L.table.location}</th><th>${L.table.status}</th><th>${L.table.actions}</th>
      </tr></thead>
      <tbody id="invTbody"></tbody>
    </table>
  </div>`;
}

function statusFor(item){
  if(item.stock < item.min*0.5) return {label:STR[lang].table.critical, cls:'pill-critical', dot:'var(--red)'};
  if(item.stock < item.min) return {label:STR[lang].table.lowStock, cls:'pill-low', dot:'var(--amber)'};
  return {label:STR[lang].table.inStock, cls:'pill-ok', dot:'var(--green)'};
}

function renderInvRows(filter='', statusF='', catF=''){
  const tbody = document.getElementById('invTbody');
  if(!tbody) return;
  const f = filter.toLowerCase();
  const rows = inventoryData
    .map((item, idx)=>({item, idx}))
    .filter(({item:i}) => {
      if(f && !(i.name+i.sku+i.cat).toLowerCase().includes(f)) return false;
      if(catF && i.cat !== catF) return false;
      if(statusF){
        const s = statusFor(i);
        if(statusF==='inStock' && s.dot !== 'var(--green)') return false;
        if(statusF==='lowStock' && s.dot !== 'var(--amber)') return false;
        if(statusF==='critical' && s.dot !== 'var(--red)') return false;
      }
      return true;
    });
  if(rows.length===0){
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">${ICONS.box}<div>${lang==='en'?'No items match your search':'لا توجد أصناف مطابقة لبحثك'}</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map(({item:i, idx})=>{
    const st = statusFor(i);
    return `<tr>
      <td><div class="item-cell"><div class="item-thumb">${i.image?`<img src="${i.image}" alt="">`:ICONS.box}</div><div><div class="item-name">${lang==='en'?i.name:i.nameAr}</div><div class="item-sku">${i.sku}</div></div></div></td>
      <td>${i.sku}</td>
      <td><span class="cat-tag">${lang==='en'?i.cat:i.catAr}</span></td>
      <td>${i.stock}</td>
      <td>${i.loc}</td>
      <td><span class="status-dot" style="background:${st.dot}"></span><span class="pill ${st.cls}">${st.label}</span></td>
      <td><div class="row-actions">
        <button title="${lang==='en'?'View':'عرض'}" data-action="view" data-idx="${idx}">${ICONS.eye}</button>
        <button title="${lang==='en'?'Edit':'تعديل'}" data-action="edit" data-idx="${idx}">${ICONS.edit}</button>
        <button title="${lang==='en'?'Delete':'حذف'}" data-action="delete" data-idx="${idx}">${ICONS.trash}</button>
      </div></td>
    </tr>`;
  }).join('');
}

function bindInvRowActions(){
  const tbody = document.getElementById('invTbody');
  if(!tbody || tbody.dataset.bound) return;
  tbody.dataset.bound = '1';
  tbody.addEventListener('click', e=>{
    const btn = e.target.closest('button[data-action]');
    if(!btn) return;
    const idx = parseInt(btn.dataset.idx, 10);
    const action = btn.dataset.action;
    if(action==='view') openViewModal(idx);
    if(action==='edit') openModal(idx);
    if(action==='delete') openDeleteModal(idx);
  });
}


/* ===================================================================
   PAGE RENDER: WAREHOUSES
=================================================================== */
function renderWarehouses(){
  const L = STR[lang];
  return `
  <div class="toolbar">
    <button class="btn btn-primary" id="addWhBtn">${ICONS.plus}${lang==='en'?'Add Warehouse':'إضافة مستودع'}</button>
    <button class="btn" id="transferWhBtn">${ICONS.move}${L.wh.transfer}</button>
  </div>
  <div class="wh-grid">
    ${warehouseData.map((w,idx)=>`
      <div class="card wh-card">
        <div class="wh-top">
          <div>
            <div class="wh-name">${lang==='en'?w.name:w.nameAr}</div>
            <div class="wh-loc">${w.sections} ${L.wh.sections}</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            <button class="wh-edit-btn" data-idx="${idx}" title="${lang==='en'?'Edit':'تعديل'}" style="width:30px;height:30px;border-radius:9px;border:1px solid var(--border);background:var(--surface);color:var(--text-2);cursor:pointer;display:flex;align-items:center;justify-content:center;">${ICONS.edit}</button>
            <button class="wh-del-btn" data-idx="${idx}" title="${lang==='en'?'Delete':'حذف'}" style="width:30px;height:30px;border-radius:9px;border:1px solid var(--border);background:var(--surface);color:var(--red);cursor:pointer;display:flex;align-items:center;justify-content:center;">${ICONS.trash}</button>
            <div class="stat-icon" style="background:var(--blue-soft);color:var(--blue)">${ICONS.warehouse}</div>
          </div>
        </div>
        <div>
          <div class="wh-meta"><span>${L.wh.occupancy}</span><span><b>${w.occ}%</b></span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${w.occ}%;background:${w.color}"></div></div>
        </div>
        <div class="wh-meta"><span>${L.wh.items}</span><span>${w.items}</span></div>
        <div style="display:flex;gap:8px;padding-top:4px;border-top:1px solid var(--border);">
          <button class="wh-edit-btn btn" data-idx="${idx}" style="flex:1;justify-content:center;font-size:12px;padding:7px 8px;">${ICONS.edit} ${lang==='en'?'Edit':'تعديل'}</button>
          <button class="wh-del-btn btn" data-idx="${idx}" style="flex:1;justify-content:center;font-size:12px;padding:7px 8px;color:var(--red);">${ICONS.trash} ${lang==='en'?'Delete':'حذف'}</button>
        </div>
      </div>`).join('')}
  </div>`;
}

/* ===================================================================
   PAGE RENDER: PURCHASING
=================================================================== */
/* Purchase Orders Store */
const purchaseOrders = withFirestoreSync([
  { id:'PO-2291', supplier:'Al-Bina Steel Co.', date:'2026-06-12', deliveryDate:'2026-06-28',
    items:[{name:'Steel Coil — Grade A',sku:'SKU-S4109',qty:200,unit:'kg',price:92.10,total:18420}],
    notes:'Urgent delivery required', status:'approved', subtotal:18420, vat:2763, grandTotal:21183 },
  { id:'PO-2292', supplier:'Gulf Hydraulics Ltd.', date:'2026-06-15', deliveryDate:'2026-06-30',
    items:[{name:'Heavy-Duty Hydraulic Pump (AP-500)',sku:'SKU-880012',qty:5,unit:'pcs',price:1230,total:6150}],
    notes:'', status:'pending', subtotal:6150, vat:922.5, grandTotal:7072.5 },
  { id:'PO-2293', supplier:'Falcon Automation', date:'2026-06-18', deliveryDate:'2026-07-02',
    items:[{name:'Industrial Control Panel (X-340)',sku:'SKU-654001',qty:3,unit:'pcs',price:8300,total:24900}],
    notes:'Include installation manual', status:'approved', subtotal:24900, vat:3735, grandTotal:28635 },
], 'purchase_orders', 'id');
let poCounter = 2294;
function nextPOId(){
  // Derive the next id from the highest existing PO number currently in
  // memory (which, once Supabase is connected, includes restored data —
  // not just the stale in-page counter). This prevents id collisions
  // after a reload when purchaseOrders has been repopulated from the
  // database with numbers higher than the original hardcoded counter.
  const maxExisting = purchaseOrders.reduce((max, po) => {
    const n = parseInt(String(po.id||'').replace('PO-',''), 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, poCounter - 1);
  poCounter = maxExisting + 2;
  return 'PO-'+(maxExisting+1);
}

function poStatusCfg(status){
  const map = {
    approved: {cls:'pill-ok',   en:'Approved',    ar:'مُعتمد'},
    pending:  {cls:'pill-low',  en:'Pending',      ar:'قيد الانتظار'},
    received: {cls:'pill-ok',   en:'Received',     ar:'مُستلَم'},
    cancelled:{cls:'pill-critical',en:'Cancelled', ar:'ملغي'},
  };
  return map[status]||{cls:'pill-low',en:status,ar:status};
}

function renderPurchasing(){
  const L = STR[lang];
  const totalPOs   = purchaseOrders.length;
  const pendingPOs = purchaseOrders.filter(p=>p.status==='pending').length;
  return `
  <div class="kpi-strip">
    ${statCard(ICONS.users,'var(--blue)','var(--blue-soft)',    L.purchasing.suppliers, String(suppliers.length),'+1', true)}
    ${statCard(ICONS.purchase,'var(--amber)','var(--amber-soft)',L.purchasing.openPOs,   String(pendingPOs),'+0', true)}
    ${statCard(ICONS.movements,'var(--green)','var(--green-soft)',L.purchasing.avgDelivery,'11.5 '+L.units.days,'-1.2', true)}
  </div>
  <div class="toolbar">
    <button class="btn btn-primary" id="newPoBtn">${ICONS.plus}${L.purchasing.newPO}</button>
    <div class="table-search" style="max-width:300px;">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      <input id="poSearch" placeholder="${lang==='en'?'Search orders...':'ابحث في الطلبات...'}">
    </div>
  </div>
  <div class="row-2">
    <div class="table-card" style="overflow:auto;">
      <table>
        <thead><tr>
          <th>PO #</th>
          <th>${lang==='en'?'Supplier':'المورد'}</th>
          <th>${lang==='en'?'Date':'التاريخ'}</th>
          <th>${lang==='en'?'Delivery':'التسليم'}</th>
          <th>${lang==='en'?'Total':'الإجمالي'}</th>
          <th>${L.table.status}</th>
          <th>${L.table.actions}</th>
        </tr></thead>
        <tbody id="poTableBody">
          ${purchaseOrders.length===0
            ? `<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-2);">${lang==='en'?'No purchase orders yet':'لا توجد طلبات شراء بعد'}</td></tr>`
            : purchaseOrders.map((po,idx)=>{
                const st = poStatusCfg(po.status);
                return `<tr>
                  <td><b style="color:var(--blue);">${po.id}</b></td>
                  <td>${po.supplier}</td>
                  <td>${po.date||'—'}</td>
                  <td>${po.deliveryDate||'—'}</td>
                  <td><b>SAR ${(po.grandTotal||0).toLocaleString('en',{minimumFractionDigits:2})}</b></td>
                  <td><span class="pill ${st.cls}">${lang==='en'?st.en:st.ar}</span></td>
                  <td>
                    <div class="row-actions">
                      <button title="${lang==='en'?'View':'عرض'}" data-action="viewpo" data-idx="${idx}">${ICONS.eye}</button>
                      <button title="${lang==='en'?'Edit':'تعديل'}" data-action="editpo" data-idx="${idx}">${ICONS.edit}</button>
                      <button title="${lang==='en'?'Delete':'حذف'}" data-action="deletepo" data-idx="${idx}">${ICONS.trash}</button>
                    </div>
                  </td>
                </tr>`;
              }).join('')
          }
        </tbody>
      </table>
    </div>
    <div class="card">
      <div class="card-head"><div class="card-title">${L.purchasing.supplierPerf}</div></div>
      ${suppliers.map(s=>`
        <div class="alert-row" style="background:var(--surface);border:1px solid var(--border)">
          <div class="alert-mid">
            <div class="alert-name">${lang==='en'?s.name:s.nameAr}</div>
            <div class="alert-sku">${s.delivery} ${L.units.days} · ${s.quality}% ${lang==='en'?'quality':'جودة'} · ${s.orders} ${lang==='en'?'orders':'طلب'}</div>
          </div>
          <span class="pill ${s.status==='good'?'pill-ok':'pill-critical'}">${s.status==='good'?(lang==='en'?'Good':'جيد'):(lang==='en'?'Delay':'تأخير')}</span>
        </div>`).join('')}
    </div>
  </div>`;
}

/* ===================================================================
   PAGE RENDER: ISSUES
=================================================================== */
function renderIssues(){
  const L = STR[lang];
  const pending = reqsData.filter(r=>r.status==='pending').length;
  const approvedToday = reqsData.filter(r=>r.status==='approved').length;
  const deptCount = [...new Set(reqsData.map(r=>r.dept))].length;
  return `
  <div class="kpi-strip">
    ${statCard(ICONS.issue,'var(--amber)','var(--amber-soft)', L.issues.pending,String(pending),'+'+Math.max(0,pending-1), false)}
    ${statCard(ICONS.flag,'var(--green)','var(--green-soft)', L.issues.approvedToday,String(approvedToday),'+'+Math.max(0,approvedToday), true)}
    ${statCard(ICONS.warehouse,'var(--blue)','var(--blue-soft)', L.issues.departments,String(deptCount),'0', true)}
  </div>
  <div class="toolbar"><button class="btn btn-primary" id="newIssueBtn">${ICONS.plus}${L.issues.newRequest}</button></div>
  <div class="card">
    <div class="card-head"><div class="card-title">${L.issues.list}</div></div>
    ${reqsData.map((r,idx)=>`
      <div class="alert-row">
        <div class="alert-icon" style="background:var(--blue-soft);color:var(--blue)">${ICONS.issue}</div>
        <div class="alert-mid">
          <div class="alert-name">${r.id} — ${lang==='en'?r.item:r.itemAr} × ${r.qty}</div>
          <div class="alert-sku">${lang==='en'?r.dept:r.deptAr}</div>
        </div>
        <span class="pill ${r.status==='approved'?'pill-ok':'pill-low'}" onclick="toggleReqStatus(${idx})" style="cursor:pointer;">${r.status==='approved'?(lang==='en'?'Approved':'تمت الموافقة'):(lang==='en'?'Pending':'قيد الانتظار')}</span>
        <div class="row-actions">
          <button title="${lang==='en'?'View':'عرض'}" data-action="viewreq" data-idx="${idx}">${ICONS.eye}</button>
          <button title="${lang==='en'?'Edit':'تعديل'}" data-action="editreq" data-idx="${idx}">${ICONS.edit}</button>
          <button title="${lang==='en'?'Delete':'حذف'}" data-action="deletereq" data-idx="${idx}">${ICONS.trash}</button>
        </div>
      </div>`).join('')}
  </div>`;
}

/* ===================================================================
   PAGE RENDER: MOVEMENTS
=================================================================== */
const movementsData = [
  {type:'inbound',  ref:'GRN-1042', item:'Steel Coil — Grade A',        itemAr:'لفافة صلب — درجة أ',          qty:'+500 kg',  wh:'WH-A',       time:'09:42 AM'},
  {type:'outbound', ref:'SHP-3381', item:'Heavy-Duty Hydraulic Pump',    itemAr:'مضخة هيدروليكية ثقيلة',      qty:'-12 pcs',  wh:'WH-A',       time:'10:15 AM'},
  {type:'transfer', ref:'TRF-220',  item:'Bearing Kit (BK-900)',         itemAr:'طقم محامل (BK-900)',          qty:'80 pcs',   wh:'WH-B → WH-C',time:'11:33 AM'},
  {type:'inbound',  ref:'GRN-1043', item:'Raw Polymer Pellets',          itemAr:'حبيبات بوليمر خام',           qty:'+1.2 t',   wh:'WH-A',       time:'01:08 PM'},
  {type:'outbound', ref:'SHP-3382', item:'Pneumatic Drill (PD-75)',      itemAr:'مثقاب هوائي (PD-75)',         qty:'-5 pcs',   wh:'WH-B',       time:'02:20 PM'},
  {type:'transfer', ref:'TRF-221',  item:'Gear Assembly Unit',           itemAr:'وحدة تجميع التروس',           qty:'10 pcs',   wh:'WH-C → WH-A',time:'03:45 PM'},
];

function renderMovements(){
  const L = STR[lang];
  return `
  <div class="toolbar">
    <button class="btn" id="movFilterBtn">${ICONS.filter}${L.toolbar.filter}</button>
    <button class="btn" id="movExportBtn">${ICONS.download}${L.toolbar.export}</button>
  </div>
  <div class="filter-panel" id="movFilterPanel">
    <div class="field">
      <label>${L.movements.title}</label>
      <select id="movFilterType">
        <option value="">${L.toolbar.filterAll}</option>
        <option value="inbound">${L.movements.inbound}</option>
        <option value="outbound">${L.movements.outbound}</option>
        <option value="transfer">${L.movements.transfer}</option>
      </select>
    </div>
    <button class="btn-mini" id="movFilterApply">${L.toolbar.applyFilter}</button>
    <button class="btn-mini" id="movFilterReset" style="background:var(--surface-2);color:var(--text);">${L.toolbar.resetFilter}</button>
  </div>
  <div class="table-card">
    <table><thead><tr>
      <th>${lang==='en'?'Ref':'المرجع'}</th>
      <th>${lang==='en'?'Type':'النوع'}</th>
      <th>${L.table.item}</th>
      <th>${lang==='en'?'Qty':'الكمية'}</th>
      <th>${lang==='en'?'Warehouse':'المستودع'}</th>
      <th>${lang==='en'?'Time':'الوقت'}</th>
    </tr></thead>
    <tbody id="movTbody"></tbody>
    </table>
  </div>`;
}

function renderMovRows(typeF=''){
  const L = STR[lang];
  const tbody = document.getElementById('movTbody');
  if(!tbody) return;
  const rows = movementsData.filter(m => !typeF || m.type===typeF);
  if(!rows.length){
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-2);">${lang==='en'?'No movements found':'لا توجد حركات مطابقة'}</td></tr>`;
    return;
  }
  const cfg = {
    inbound:  {c:'pill-ok'},
    outbound: {c:'pill-low'},
    transfer: {c:'pill-critical'},
  };
  tbody.innerHTML = rows.map(m => {
    const lbl = L.movements[m.type];
    return `<tr>
      <td><b>${m.ref}</b></td>
      <td><span class="pill ${cfg[m.type].c}">${lbl}</span></td>
      <td>${lang==='en'?m.item:m.itemAr}</td>
      <td>${m.qty}</td>
      <td>${m.wh}</td>
      <td>${m.time}</td>
    </tr>`;
  }).join('');
}

/* ===================================================================
   PAGE RENDER: REPORTS
=================================================================== */
const REPORT_TYPES = ['slow','fast','purchases','disbursement','suppliers','inventory'];
let currentReport = 'slow';
let reportDateFrom = '';
let reportDateTo = '';

function getReportDateRange(){
  return {from: reportDateFrom, to: reportDateTo};
}

function reportFilteredDate(data, dateField, from, to){
  if(!from && !to) return data;
  return data.filter(d => {
    const dt = d[dateField];
    if(!dt) return true;
    if(from && dt < from) return false;
    if(to && dt > to) return false;
    return true;
  });
}

/* ── 1. Slow-Moving Items ── */
function getSlowMovingData(from='', to=''){
  const movementCount = {};
  movementsData.forEach(m => {
    const key = lang==='en' ? m.item : m.itemAr;
    movementCount[key] = (movementCount[key]||0) + 1;
  });
  return inventoryData
    .map(i => ({
      ...i,
      movCount: movementCount[lang==='en' ? i.name : i.nameAr] || 0,
      lastMovement: movementsData
        .filter(m => (lang==='en'?m.item:m.itemAr) === (lang==='en'?i.name:i.nameAr))
        .pop()?.time || '—'
    }))
    .filter(i => i.stock <= i.min || i.movCount <= 1)
    .sort((a,b) => a.stock/a.min - b.stock/b.min);
}

/* ── 2. Fast-Moving Items ── */
function getFastMovingData(from='', to=''){
  const counts = {};
  movementsData.forEach(m => {
    const key = lang==='en' ? m.item : m.itemAr;
    if(!counts[key]) counts[key] = {name:m.item, nameAr:m.itemAr, count:0, last:''};
    counts[key].count++;
    counts[key].last = m.time;
  });
  return Object.values(counts)
    .filter(c => c.count >= 2)
    .sort((a,b) => b.count - a.count)
    .map(c => {
      const inv = inventoryData.find(i => (lang==='en'?i.name:i.nameAr) === (lang==='en'?c.name:c.nameAr));
      return {...c, sku: inv?.sku||'—', stock: inv?.stock||0};
    });
}

/* ── 3. Purchases Report ── */
function getPurchasesData(from='', to=''){
  let data = purchaseOrders.map(po => ({
    id: po.id,
    supplier: po.supplier,
    date: po.date,
    deliveryDate: po.deliveryDate,
    items: po.items.length,
    total: po.grandTotal || po.total || 0,
    status: po.status
  }));
  data = reportFilteredDate(data, 'date', from, to);
  return data;
}

/* ── 4. Disbursement by Project ── */
function getDisbursementData(from='', to=''){
  let data = reqsData.map(r => ({
    id: r.id,
    department: lang==='en' ? r.dept : r.deptAr,
    item: lang==='en' ? r.item : r.itemAr,
    qty: r.qty,
    date: r.date,
    priority: r.priority,
    status: r.status
  }));
  data = reportFilteredDate(data, 'date', from, to);
  return data;
}

/* ── 5. Suppliers Report ── */
function getSuppliersData(from='', to=''){
  return suppliers.map(s => {
    const poList = purchaseOrders.filter(po => po.supplier === s.name);
    const totalSpend = poList.reduce((sum, po) => sum + (po.grandTotal || po.total || 0), 0);
    const orderCount = s.orders || poList.length;
    return {
      name: lang==='en' ? s.name : s.nameAr,
      delivery: s.delivery,
      quality: s.quality,
      orders: orderCount,
      totalSpend: totalSpend,
      status: s.status
    };
  });
}

/* ── 6. Inventory Report ── */
function getInventoryData(from='', to=''){
  return inventoryData.map(i => ({
    name: lang==='en' ? i.name : i.nameAr,
    sku: i.sku,
    stock: i.stock,
    min: i.min,
    location: i.loc,
    cat: lang==='en' ? i.cat : i.catAr,
    status: i.stock <= 0 ? 'critical' : i.stock < i.min ? 'low' : 'in'
  }));
}

/* ── Render a generic report table ── */
function renderReportTable(headers, rows){
  if(!rows || rows.length===0){
    return '<div class="empty-state" style="margin:30px 0;">' + ICONS.box + '<div>' + STR[lang].reports.noData + '</div></div>';
  }
  return `<div class="table-card"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${
    rows.map(cells => `<tr>${cells.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')
  }</tbody></table></div>`;
}

/* ── Print Report ── */
function openPrintWindow(html){
  try {
    const w = window.open('','_blank');
    if(!w) return;
    w.document.write(html);
    w.document.close();
  } catch(e){ showToast('Print error: '+e.message,'error'); }
}
function printReport(){
  const L = STR[lang].reports;
  const nameMap = {slow:L.slow, fast:L.fast, purchases:L.purchases, disbursement:L.disbursement, suppliers:L.suppliers, inventory:L.inventory};
  const data = getReportRows(currentReport);
  if(!data) return;
  const head = data.headers && data.headers.length ? data.headers.map(h=>`<th>${String(h).replace(/<[^>]+>/g,'')}</th>`).join('') : '';
  const body = data.rows && data.rows.length ? data.rows.map(r=>`<tr>${r.map(c=>`<td>${String(c).replace(/<[^>]+>/g,'')}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="99" style="text-align:center;padding:20px;color:#999;">${L.noData}</td></tr>`;
  openPrintWindow(`<html><head><style>
    body{font-family:'Inter','Tajawal',sans-serif;padding:30px;color:#1a1a2e;}
    h1{font-size:18px;font-weight:800;text-align:center;margin:0 0 4px;}
    .meta{text-align:center;font-size:11px;color:#666;margin-bottom:20px;}
    table{width:100%;border-collapse:collapse;font-size:12px;}
    th{background:#f5f6fa;padding:10px 12px;text-align:start;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#666;font-weight:700;border-bottom:2px solid #e0e0e0;}
    td{padding:10px 12px;border-bottom:1px solid #eee;}
    tr:last-child td{border-bottom:none;}
    .footer{text-align:center;font-size:10px;color:#999;margin-top:30px;padding-top:14px;border-top:1px solid #e0e0e0;}
    @media print{body{padding:0;} .no-print{display:none;}}
  </style></head><body>
  <div class="no-print" style="text-align:right;margin-bottom:10px;"><button onclick="window.print()">${L.print}</button></div>
  <h1>${nameMap[currentReport]}</h1>
  <div class="meta">${new Date().toLocaleDateString()}</div>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
  <div class="footer">StockFlow — ${lang==='en'?'Smart Warehouse Management':'إدارة المستودعات الذكية'}</div>
  </body></html>`);
}

function getReportRows(type){
  const L = STR[lang].reports;
  const {from, to} = getReportDateRange();
  let headers, rows;
  switch(type){
    case 'slow': {
      const d = getSlowMovingData(from,to);
      headers = [L.colItem, L.colSku, L.colStock, L.colMin, L.colLocation, L.colMovements, L.colMovement];
      rows = d.map(i => [lang==='en'?i.name:i.nameAr, i.sku, i.stock, i.min, i.loc, i.movCount, i.lastMovement]);
      break;
    }
    case 'fast': {
      const d = getFastMovingData(from,to);
      headers = [L.colItem, L.colSku, L.colStock, L.colMovements, L.colMovement];
      rows = d.map(i => [lang==='en'?i.name:i.nameAr, i.sku, i.stock, i.count, i.last]);
      break;
    }
    case 'purchases': {
      const d = getPurchasesData(from,to);
      headers = ['PO#', L.colSupplier, L.colDate, lang==='en'?'Items':'البنود', L.colTotal, L.colStatus];
      rows = d.map(x => [x.id, x.supplier, x.date, x.items, 'SAR '+(x.total||0).toLocaleString('en',{minimumFractionDigits:2}), x.status]);
      break;
    }
    case 'disbursement': {
      const d = getDisbursementData(from,to);
      headers = [L.colDepartment, L.colItem, L.colQty, L.colDate, L.colPriority, L.colStatus];
      rows = d.map(x => [x.department, x.item, x.qty, x.date, x.priority, x.status]);
      break;
    }
    case 'suppliers': {
      const d = getSuppliersData(from,to);
      headers = [L.colSupplier, L.colDelivery, L.colQuality, L.colOrders, L.colSpend, L.colStatus];
      rows = d.map(x => [x.name, x.delivery+' '+(lang==='en'?'days':'أيام'), x.quality+'%', x.orders, 'SAR '+(x.totalSpend||0).toLocaleString('en',{minimumFractionDigits:2}), x.status]);
      break;
    }
    case 'inventory': {
      const d = getInventoryData(from,to);
      headers = [L.colItem, L.colSku, L.colStock, L.colMin, L.colLocation, L.colValue, L.colStatus];
      const invStatusMap = {in:lang==='en'?'In Stock':'متوفر', low:lang==='en'?'Low':'منخفض', critical:lang==='en'?'Critical':'حرج'};
      rows = d.map(x => [x.name, x.sku, x.stock, x.min, x.location, 'SAR '+(x.stock * (x.sku==='SKU-880012'?2500 : x.sku==='SKU-654001'?3200 : x.sku==='SKU-123456'?450 : x.sku==='SKU-230911'?180 : x.sku==='SKU-S4109'?920 : x.sku==='SKU-M2033'?1800 : x.sku==='SKU-R1102'?650 : 350)).toLocaleString('en',{minimumFractionDigits:0}), invStatusMap[x.status]||x.status]);
      break;
    }
    default: headers=[]; rows=[];
  }
  return {headers, rows};
}

/* ── Main Reports Page ── */
function renderReports(){
  const L = STR[lang].reports;
  const tabNames = [L.slow, L.fast, L.purchases, L.disbursement, L.suppliers, L.inventory];
  const tabs = REPORT_TYPES.map((t,i) =>
    `<span class="report-tab${t===currentReport?' active':''}" data-rt="${t}">${tabNames[i]}</span>`
  ).join('');

  const {from, to} = getReportDateRange();
  let kpis = '', table = '', title = '';

  switch(currentReport){
    case 'slow': {
      const data = getSlowMovingData(from, to);
      title = L.slow;
      kpis = `<div class="report-kpis">
        <div class="report-kpi"><span class="report-kpi-label">${lang==='en'?'Items Below Min':'الأصناف تحت الحد الأدنى'}</span><span class="report-kpi-value" style="color:var(--red);">${data.filter(i=>i.stock<=i.min).length}</span></div>
        <div class="report-kpi"><span class="report-kpi-label">${lang==='en'?'Total Items':'إجمالي الأصناف'}</span><span class="report-kpi-value">${data.length}</span></div>
      </div>`;
      table = renderReportTable(
        [L.colItem, L.colSku, L.colStock, L.colMin, L.colLocation, L.colMovements, L.colMovement],
        data.map(i => [lang==='en'?i.name:i.nameAr, i.sku, `<span style="font-weight:700;color:${i.stock<=i.min?'var(--red)':'var(--text)'};">${i.stock}</span>`, i.min, i.loc, i.movCount, i.lastMovement])
      );
      break;
    }
    case 'fast': {
      const data = getFastMovingData(from, to);
      title = L.fast;
      kpis = `<div class="report-kpis">
        <div class="report-kpi"><span class="report-kpi-label">${lang==='en'?'Highly Active Items':'الأصناف عالية الحركة'}</span><span class="report-kpi-value" style="color:var(--green);">${data.length}</span></div>
        <div class="report-kpi"><span class="report-kpi-label">${lang==='en'?'Total Movements':'إجمالي الحركات'}</span><span class="report-kpi-value">${data.reduce((s,d)=>s+d.count,0)}</span></div>
      </div>`;
      table = renderReportTable(
        [L.colItem, L.colSku, L.colStock, L.colMovements, L.colMovement],
        data.map(i => [lang==='en'?i.name:i.nameAr, i.sku, i.stock, `<span style="font-weight:700;color:var(--green);">${i.count}</span>`, i.last])
      );
      break;
    }
    case 'purchases': {
      const data = getPurchasesData(from, to);
      title = L.purchases;
      const totalAmt = data.reduce((s,d)=>s+d.total,0);
      kpis = `<div class="report-kpis">
        <div class="report-kpi"><span class="report-kpi-label">${lang==='en'?'Total Orders':'إجمالي الطلبات'}</span><span class="report-kpi-value">${data.length}</span></div>
        <div class="report-kpi"><span class="report-kpi-label">${lang==='en'?'Total Spend':'إجمالي المشتريات'}</span><span class="report-kpi-value" style="color:var(--blue);">SAR ${totalAmt.toLocaleString('en',{minimumFractionDigits:2})}</span></div>
      </div>`;
      table = renderReportTable(
        [L.colItem.replace('Item','PO #'), L.colSupplier, L.colDate, lang==='en'?'Items':'البنود', L.colTotal, L.colStatus],
        data.map(d => [d.id, d.supplier, d.date, d.items, `SAR ${d.total.toLocaleString('en',{minimumFractionDigits:2})}`, `<span class="pill ${d.status==='approved'?'pill-ok':'pill-low'}">${d.status}</span>`])
      );
      break;
    }
    case 'disbursement': {
      const data = getDisbursementData(from, to);
      title = L.disbursement;
      kpis = `<div class="report-kpis">
        <div class="report-kpi"><span class="report-kpi-label">${lang==='en'?'Total Requests':'إجمالي الطلبات'}</span><span class="report-kpi-value">${data.length}</span></div>
        <div class="report-kpi"><span class="report-kpi-label">${lang==='en'?'Departments':'الأقسام'}</span><span class="report-kpi-value">${new Set(data.map(d=>d.department)).size}</span></div>
      </div>`;
      table = renderReportTable(
        [L.colDepartment, L.colItem, L.colQty, L.colDate, L.colPriority, L.colStatus],
        data.map(d => [d.department, d.item, d.qty, d.date, `<span class="pill ${d.priority==='urgent'||d.priority==='critical'?'pill-ok':'pill-low'}">${d.priority}</span>`, `<span class="pill ${d.status==='approved'?'pill-ok':'pill-low'}">${d.status}</span>`])
      );
      break;
    }
    case 'suppliers': {
      const data = getSuppliersData(from, to);
      title = L.suppliers;
      const avgDelivery = data.length ? Math.round(data.reduce((s,d)=>s+d.delivery,0)/data.length) : 0;
      kpis = `<div class="report-kpis">
        <div class="report-kpi"><span class="report-kpi-label">${lang==='en'?'Active Suppliers':'الموردون النشطون'}</span><span class="report-kpi-value">${data.length}</span></div>
        <div class="report-kpi"><span class="report-kpi-label">${lang==='en'?'Avg Delivery':'متوسط التسليم'}</span><span class="report-kpi-value">${avgDelivery} ${lang==='en'?'days':'أيام'}</span></div>
      </div>`;
      table = renderReportTable(
        [L.colSupplier, L.colDelivery, L.colQuality, L.colOrders, L.colSpend, L.colStatus],
        data.map(d => [d.name, d.delivery, `${d.quality}%`, d.orders, `SAR ${d.totalSpend.toLocaleString('en',{minimumFractionDigits:2})}`, `<span class="pill ${d.status==='good'?'pill-ok':'pill-low'}">${d.status}</span>`])
      );
      break;
    }
    case 'inventory': {
      const data = getInventoryData(from, to);
      title = L.inventory;
      const totalValue = data.reduce((s,d)=>s + d.stock * (d.sku==='SKU-880012'?2500 : d.sku==='SKU-654001'?3200 : d.sku==='SKU-123456'?450 : d.sku==='SKU-230911'?180 : d.sku==='SKU-S4109'?920 : d.sku==='SKU-M2033'?1800 : d.sku==='SKU-R1102'?650 : 350), 0);
      kpis = `<div class="report-kpis">
        <div class="report-kpi"><span class="report-kpi-label">${lang==='en'?'Total Items':'إجمالي الأصناف'}</span><span class="report-kpi-value">${data.length}</span></div>
        <div class="report-kpi"><span class="report-kpi-label">${lang==='en'?'Total Stock':'إجمالي الرصيد'}</span><span class="report-kpi-value">${data.reduce((s,d)=>s+d.stock,0)}</span></div>
        <div class="report-kpi"><span class="report-kpi-label">${lang==='en'?'Est. Value':'القيمة التقديرية'}</span><span class="report-kpi-value" style="color:var(--blue);">SAR ${totalValue.toLocaleString('en',{minimumFractionDigits:0})}</span></div>
      </div>`;
      const statusMap = {in:lang==='en'?'In Stock':'متوفر', low:lang==='en'?'Low':'منخفض', critical:lang==='en'?'Critical':'حرج'};
      const statusClass = {in:'pill-ok', low:'pill-low', critical:'pill-low'};
      table = renderReportTable(
        [L.colItem, L.colSku, L.colStock, L.colMin, L.colLocation, L.colValue, L.colStatus],
        data.map(d => [d.name, d.sku,
          `<span style="font-weight:700;color:${d.stock<=0?'var(--red)':d.stock<d.min?'var(--amber)':'var(--text)'};">${d.stock}</span>`,
          d.min, d.location,
          `SAR ${(d.stock * (d.sku==='SKU-880012'?2500 : d.sku==='SKU-654001'?3200 : d.sku==='SKU-123456'?450 : d.sku==='SKU-230911'?180 : d.sku==='SKU-S4109'?920 : d.sku==='SKU-M2033'?1800 : d.sku==='SKU-R1102'?650 : 350)).toLocaleString('en',{minimumFractionDigits:0})}`,
          `<span class="pill ${statusClass[d.status]}">${statusMap[d.status]}</span>`
        ])
      );
      break;
    }
  }

  return `
  <div class="report-tabs">${tabs}</div>
  <div class="report-filter">
    <label>${L.fromDate}</label>
    <input type="date" id="repFrom" value="${from}">
    <label>${L.toDate}</label>
    <input type="date" id="repTo" value="${to}">
    <button class="btn-mini" id="repFilterApply">${L.applyFilter}</button>
    <button class="btn-mini" id="repFilterReset" style="background:var(--surface-2);color:var(--text);">${L.resetFilter}</button>
  </div>
  <div class="report-actions">
    <div class="report-title">${title}</div>
    <button class="btn-mini" id="repPrintBtn">${L.print}</button>
    <button class="btn-mini" id="repExportBtn" style="background:var(--green);">${L.exportExcel}</button>
  </div>
  ${kpis}
  ${table}`;
}

/* ===================================================================
   SETTINGS STATE
=================================================================== */
const settings = JSON.parse(localStorage.getItem('stockflow_settings') || '{"lowStock":true,"expiry":true,"approval":true,"backup":true,"offline":true}');

function saveSettings(){
  localStorage.setItem('stockflow_settings', JSON.stringify(settings));
}

function toggleSetting(key){
  settings[key] = !settings[key];
  saveSettings();
  navigate(currentPage);
}

/* ===================================================================
   PAGE RENDER: SETTINGS
================================================================== */
const usersData = [
  {name:'Sarah Chen', email:'admin@stockflow.com', password:encodePW('123456'), role:'admin', dept:'IT / Systems', deptAr:'تقنية المعلومات', init:'SC'},
  {name:'Ahmed Al-Faraj', email:'ahmed@stockflow.com', password:encodePW('123456'), role:'manager', dept:'WH-A', deptAr:'WH-A', init:'AF'},
  {name:'Khalid Nasser', email:'khalid@stockflow.com', password:encodePW('123456'), role:'supervisor', dept:'WH-B', deptAr:'WH-B', init:'KN'},
  {name:'Layla Mansour', email:'layla@stockflow.com', password:encodePW('123456'), role:'employee', dept:'Production', deptAr:'الإنتاج', init:'LM'},
];

function syncLoginUsers(){
  LOGIN_USERS.length = 0;
  LOGIN_USERS.push({ username:'admin', password:encodePW('123456'), name:'Sarah Chen', role:'Administrator', roleAr:'مدير النظام' });
  usersData.forEach(u => {
    LOGIN_USERS.push({
      username: u.email,
      password: u.password,
      name: u.name,
      role: getRoleLabel(u.role),
      roleAr: ({admin:'مدير النظام',manager:'مدير',supervisor:'مشرف',employee:'موظف'})[u.role]||u.role,
    });
  });
}

function getRoleLabel(roleKey){
  const L = STR[lang];
  const map = {
    admin: L.users.admin,
    manager: L.users.manager,
    supervisor: L.users.supervisor,
    employee: L.users.employee,
  };
  return map[roleKey] || roleKey;
}

function renderUsersRows(){
  const tbody = document.getElementById('usersTbody');
  if(!tbody) return;
  tbody.innerHTML = usersData.map((u, idx)=>{
    const time = lang==='en'?'Just now':'الآن';
    return `<tr>
      <td><div class="item-cell"><div class="avatar" style="width:32px;height:32px;font-size:11px;">${u.init}</div><div class="item-name">${u.name}</div><div class="item-sku">${u.email}</div></div></td>
      <td><span class="cat-tag">${getRoleLabel(u.role)}</span></td><td>${lang==='en'?u.dept:u.deptAr}</td><td>${time}</td>
      <td><div class="row-actions">
        <button title="${lang==='en'?'Edit':'تعديل'}" data-action="edituser" data-idx="${idx}">${ICONS.edit}</button>
        <button title="${lang==='en'?'Delete':'حذف'}" data-action="deleteuser" data-idx="${idx}">${ICONS.trash}</button>
      </div></td>
    </tr>`;
  }).join('');
}

function renderUsers(){
  const L = STR[lang];
  return `
  <div class="toolbar"><button class="btn btn-primary" id="addUserBtn">${ICONS.plus}${L.users.addUser}</button></div>
  <div class="table-card">
    <table><thead><tr><th>${lang==='en'?'Name':'الاسم'}</th><th>${L.users.role}</th><th>${lang==='en'?'Department':'القسم'}</th><th>${L.users.lastActive}</th><th>${L.table.actions}</th></tr></thead>
    <tbody id="usersTbody"></tbody></table>
  </div>`;
}

let userEditIdx = -1;

function openUserModal(idx){
  userEditIdx = idx != null ? idx : -1;
  const L = STR[lang];
  document.getElementById('userModalTitle').textContent = userEditIdx>=0 ? (lang==='en'?'Edit User':'تعديل المستخدم') : (lang==='en'?'Add User':'إضافة مستخدم');
  document.getElementById('userSave').textContent = userEditIdx>=0 ? (lang==='en'?'Save':'حفظ') : (lang==='en'?'Add User':'إضافة مستخدم');
  document.getElementById('userLblName').textContent = lang==='en'?'Full Name':'الاسم الكامل';
  document.getElementById('userLblEmail').textContent = lang==='en'?'Email':'البريد الإلكتروني';
  document.getElementById('userLblPassword').textContent = lang==='en'?'Password':'كلمة المرور';
  document.getElementById('userLblRole').textContent = lang==='en'?'Role':'الدور';
  document.getElementById('userLblDept').textContent = lang==='en'?'Department':'القسم';
  document.getElementById('userCancel').textContent = L.modal.cancel;
  if(userEditIdx>=0){
    const u = usersData[userEditIdx];
    document.getElementById('userInputName').value = u.name;
    document.getElementById('userInputEmail').value = u.email;
    document.getElementById('userInputPassword').value = u.password;
    document.getElementById('userRole').value = u.role;
    document.getElementById('userDept').value = lang==='en'?u.dept:u.deptAr;
  } else {
    document.getElementById('userInputName').value = '';
    document.getElementById('userInputEmail').value = '';
    document.getElementById('userInputPassword').value = '';
    document.getElementById('userRole').value = 'employee';
    document.getElementById('userDept').value = '';
  }
  document.getElementById('userModalOverlay').style.display = 'flex';
}

function closeUserModal(){
  document.getElementById('userModalOverlay').style.display = 'none';
}

function syncUsers(){
  // Sync users to Supabase WITHOUT the password field — even though it's
  // only base64-encoded locally (not real encryption), storing it in a
  // shared database table that every logged-in staff member can read
  // (per our current RLS policy) would be a real exposure. Real
  // authentication should go through Supabase Auth (real email login),
  // not this legacy demo password field.
  if(window.StockFlowBackend && window.StockFlowBackend.enabled){
    const sanitized = usersData.map(({password, ...rest}) => rest);
    window.StockFlowBackend.syncCollection('users', sanitized, 'email');
  }
}

function saveUser(){
  const name = document.getElementById('userInputName').value.trim();
  const email = document.getElementById('userInputEmail').value.trim();
  const password = document.getElementById('userInputPassword').value.trim();
  const role = document.getElementById('userRole').value;
  const dept = document.getElementById('userDept').value.trim();
  if(!name || !email || !password){
    showToast(lang==='en'?'Please fill in all required fields':'يرجى ملء جميع الحقول المطلوبة');
    return;
  }
  const words = name.trim().split(/\s+/);
  const init = ((words[0]?words[0][0]:'')+(words[1]?words[1][0]:'')).toUpperCase() || '?';
  if(userEditIdx>=0){
    const u = usersData[userEditIdx];
    u.name = name; u.email = email; u.password = encodePW(password); u.role = role;
    u.dept = dept; u.deptAr = dept; u.init = init;
  } else {
    usersData.unshift({name, email, password:encodePW(password), role, dept, deptAr:dept, init});
  }
  syncLoginUsers();
  syncUsers();
  closeUserModal();
  renderUsersRows();
  showToast(lang==='en'?'User saved!':'تم حفظ المستخدم!');
}

async function deleteUser(idx){
  const L = STR[lang];
  const ok = await showConfirm(lang==='en'?`Delete user "${usersData[idx].name}"?`:`هل تريد حذف المستخدم "${usersData[idx].name}"؟`);
  if(!ok) return;
  usersData.splice(idx, 1);
  syncLoginUsers();
  syncUsers();
  renderUsersRows();
  showToast(lang==='en'?'User deleted!':'تم حذف المستخدم!');
}

/* ===================================================================
   PAGE RENDER: NOTIFICATIONS
=================================================================== */
function renderNotifications(){
  const L = STR[lang];
  const todayEvents = getEventsForDate(fmtDate(new Date()));
  const items = [
    ...todayEvents.map(e=>({icon:ICONS.clock,c:'var(--blue)',bg:'var(--blue-soft)', title: L.calendar.eventNotifPrefix+': '+e.name, time: e.time||'—'})),
    ...getNotifItems(),
  ];
  return `
  <div class="toolbar"><button class="btn">${L.notif.markAll}</button></div>
  <div class="card simple-list">
    ${items.map(n=>`<div class="alert-row">
      <div class="alert-icon" style="background:${n.bg};color:${n.c}">${n.icon}</div>
      <div class="alert-mid"><div class="alert-name">${n.title}</div></div>
      <div class="activity-time">${n.time}</div>
    </div>`).join('')}
  </div>`;
}

/* ===================================================================
   PAGE RENDER: SETTINGS
=================================================================== */
function renderSettings(){
  const L = STR[lang];
  return `
  <div class="settings-grid">
    <div class="card">
      <div class="card-title" style="margin-bottom:6px;">${L.settings.appearance}</div>
      <div class="setting-row">
        <div><div class="setting-title">${L.settings.darkMode}</div><div class="setting-sub">${L.settings.darkModeSub}</div></div>
        <div class="switch ${theme==='dark'?'on':''}" id="darkSwitch"><div class="knob"></div></div>
      </div>
      <div class="setting-row" style="flex-direction:column;align-items:flex-start;gap:10px;">
        <div class="setting-title">${L.settings.language}</div>
        <div class="theme-swatch">
          <button class="btn ${lang==='en'?'btn-primary':''}" id="setEn" style="flex:1">EN — English</button>
          <button class="btn ${lang==='ar'?'btn-primary':''}" id="setAr" style="flex:1">AR — العربية</button>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title" style="margin-bottom:6px;">${L.settings.notifGroup}</div>
      <div class="setting-row"><div><div class="setting-title">${L.settings.lowStockAlerts}</div><div class="setting-sub">${L.settings.lowStockSub}</div></div><div class="switch ${settings.lowStock?'on':''}" id="lowStockSwitch"><div class="knob"></div></div></div>
      <div class="setting-row"><div><div class="setting-title">${L.settings.expiryAlerts}</div><div class="setting-sub">${L.settings.expirySub}</div></div><div class="switch ${settings.expiry?'on':''}" id="expirySwitch"><div class="knob"></div></div></div>
      <div class="setting-row"><div><div class="setting-title">${L.settings.approvalNotif}</div><div class="setting-sub">${L.settings.approvalSub}</div></div><div class="switch ${settings.approval?'on':''}" id="approvalSwitch"><div class="knob"></div></div></div>
    </div>
    <div class="card">
      <div class="card-title" style="margin-bottom:6px;">${L.settings.system}</div>
      <div class="setting-row"><div><div class="setting-title">${L.settings.backup}</div><div class="setting-sub">${L.settings.backupSub}</div></div><div class="switch ${settings.backup?'on':''}" id="backupSwitch"><div class="knob"></div></div></div>
      <div class="setting-row"><div><div class="setting-title">${L.settings.offline}</div><div class="setting-sub">${L.settings.offlineSub}</div></div><div class="switch ${settings.offline?'on':''}" id="offlineSwitch"><div class="knob"></div></div></div>
    </div>
  </div>`;
}

/* ===================================================================
   NAV / ROUTING
=================================================================== */

/* ===================================================================
   PROJECTS PAGE - RENDER
=================================================================== */
let currentProjectTab = 'dashboard';
let currentProjectIdx = -1;

function getPhaseLabel(id){
  const L = STR[lang].projects;
  return L[id] || id;
}
function getPhaseStatusLabel(st){
  const L = STR[lang].projects;
  if(st==='notStarted') return L.phaseNotStarted;
  if(st==='inProgress') return L.phaseInProgress;
  if(st==='completed') return L.phaseCompleted;
  if(st==='delayed') return L.phaseDelayed;
  return st;
}
function getPhaseStatusClass(st){
  if(st==='completed') return 'pill-ok';
  if(st==='inProgress') return 'pill-low';
  return 'pill-critical';
}
function getProjStatusLabel(st){
  if(st==='active') return lang==='en'?'Active':'نشط';
  if(st==='completed') return lang==='en'?'Completed':'مكتمل';
  if(st==='onHold') return lang==='en'?'On Hold':'معلق';
  if(st==='cancelled') return lang==='en'?'Cancelled':'ملغي';
  return st;
}
function getProjStatusClass(st){
  if(st==='active') return 'pill-low';
  if(st==='completed') return 'pill-ok';
  if(st==='onHold') return 'pill-warn';
  if(st==='cancelled') return 'pill-critical';
  return 'pill-ok';
}
function getPriorityLabel(pr){
  if(pr==='high') return lang==='en'?'High':'عالية';
  if(pr==='medium') return lang==='en'?'Medium':'متوسطة';
  if(pr==='low') return lang==='en'?'Low':'منخفضة';
  return pr;
}
function getPriorityClass(pr){
  if(pr==='high') return 'pill-critical';
  if(pr==='medium') return 'pill-low';
  if(pr==='low') return 'pill-ok';
  return 'pill-ok';
}
function calcEndDate(start, duration){
  if(!start || !duration) return '';
  const d = new Date(start);
  d.setDate(d.getDate() + parseInt(duration));
  return d.toISOString().split('T')[0];
}
function calcDaysRemaining(endDate){
  if(!endDate) return null;
  const diff = new Date(endDate) - new Date();
  return Math.ceil(diff / (1000*60*60*24));
}

function renderProjects(){
  const L = STR[lang].projects;
  const page = currentProjectTab === 'dashboard' ? renderProjectsDashboard() : currentProjectTab === 'plan' ? renderProjectsPlan() : renderProjectsList();
  return `<div class="report-tabs" style="margin-bottom:8px;">${[
    {key:'dashboard',label:L.dashboard},{key:'list',label:L.list},{key:'plan',label:L.plan}
  ].map(t => `<span class="report-tab${currentProjectTab===t.key?' active':''}" data-ptab="${t.key}">${t.label}</span>`).join('')}</div>${page}`;
}

function renderProjectsPlan(){
  const L = STR[lang].projects;
  const phaseColors = {notStarted:'var(--surface-2)',inProgress:'var(--blue)',completed:'var(--green)',delayed:'var(--red)'};
  const phaseTextColors = {notStarted:'var(--text-2)',inProgress:'#fff',completed:'#fff',delayed:'#fff'};
  return `<div id="planGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(380px,1fr));gap:16px;">
    ${projects.map((p, idx) => {
      const end = calcEndDate(p.startDate, p.duration);
      const remain = calcDaysRemaining(end);
      return `<div class="card" draggable="true" style="padding:16px;cursor:grab;" onclick="openProjectDetail(${idx})"
        ondragstart="event.stopPropagation();event.dataTransfer.setData('text/plain',${idx});this.style.opacity='.4'"
        ondragend="this.style.opacity='1'" ondragover="event.preventDefault()">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
          <div><b style="font-size:13px;color:var(--text-2);">${p.id}</b><div style="font-size:15px;font-weight:800;margin-top:2px;">${lang==='en'?p.name:p.nameAr}</div></div>
          <div style="text-align:right;"><span class="pill ${getProjStatusClass(p.status)}" onclick="event.stopPropagation();toggleProjectStatus(${idx})" style="cursor:pointer;">${getProjStatusLabel(p.status)}</span><div style="font-size:11px;color:var(--text-2);margin-top:3px;">${p.progress}% · ${remain !== null ? (remain < 0 ? Math.abs(remain)+(lang==='en'?'d overdue':'تأخير') : remain+(lang==='en'?'d left':'متبقي')) : '—'}</div></div>
        </div>
        <div style="display:flex;gap:4px;flex-wrap:nowrap;overflow-x:auto;padding-bottom:6px;">
          ${p.phases.map(ph => `<div style="flex:1;min-width:30px;text-align:center;">
            <div style="height:32px;background:${phaseColors[ph.status]};border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:${phaseTextColors[ph.status]};padding:0 2px;">${(ph.name||getPhaseLabel(ph.id)).replace(/^Phase /i,'P')}</div>
            <div style="display:flex;align-items:center;justify-content:center;gap:2px;margin-top:3px;">
              <span style="width:6px;height:6px;border-radius:50%;background:${phaseColors[ph.status]};display:inline-block;"></span>
              <span style="font-size:9px;color:var(--text-3);">${getPhaseProgressFromStatus(ph.status)}%</span>
            </div>
          </div>`).join('')}
        </div>
        <div class="proj-plan-meta" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:8px;font-size:11px;color:var(--text-2);">
          <div><span style="color:var(--text-3);">${L.client}</span><div style="font-weight:600;">${lang==='en'?p.client:p.clientAr}</div></div>
          <div><span style="color:var(--text-3);">${L.manager}</span><div style="font-weight:600;">${p.manager}</div></div>
          <div><span style="color:var(--text-3);">${lang==='en'?'Value':'القيمة'}</span><div style="font-weight:700;color:var(--blue);">SAR ${(p.contractValue/1000).toFixed(0)}k</div></div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;margin-top:8px;">
          <div style="flex:1;height:4px;background:var(--surface-2);border-radius:2px;"><div style="width:${p.progress}%;height:100%;background:${remain<0?'var(--red)':p.progress>=80?'var(--green)':'var(--blue)'};border-radius:2px;"></div></div>
          <span style="font-size:10px;font-weight:600;">${p.progress}%</span>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderProjectsDashboard(){
  const L = STR[lang].projects;
  const active = projects.filter(p=>p.status==='active');
  const completed = projects.filter(p=>p.status==='completed');
  const overdue = projects.filter(p=>p.status==='active' && calcDaysRemaining(calcEndDate(p.startDate,p.duration)) < 0);
  const totalVal = projects.reduce((s,p)=>s+p.contractValue,0);
  return `
  <div class="kpi-strip">
    ${statCard(ICONS.box,'var(--blue)','var(--blue-soft)',lang==='en'?'Total Projects':'إجمالي المشاريع',String(projects.length),'',true)}
    ${statCard(ICONS.flag,'var(--green)','var(--green-soft)',L.activeProjects,String(active.length),'',true)}
    ${statCard(ICONS.issue,'var(--amber)','var(--amber-soft)',L.completedProjects,String(completed.length),'',true)}
    ${statCard(ICONS.issue,'var(--red)','var(--red-soft)',L.overdueProjects,String(overdue.length),'',true)}
    ${statCard(ICONS.dollar,'var(--blue)','var(--blue-soft)',L.totalProjectsValue,'SAR '+totalVal.toLocaleString('en',{minimumFractionDigits:0}),'',true)}
  </div>
  <div class="row-2" style="grid-template-columns:1.5fr 1fr;">
    <div class="card"><div class="card-head"><div class="card-title">${L.upcomingDeadlines}</div></div>
      ${(active.length ? [...active].sort((a,b)=>calcEndDate(a.startDate,a.duration)>calcEndDate(b.startDate,b.duration)?1:-1).slice(0,5) : []).length ? `<table><thead><tr><th>${lang==='en'?'Project':'المشروع'}</th><th>${lang==='en'?'End Date':'النهاية'}</th><th>${L.progress}</th><th>${lang==='en'?'Left':'متبقي'}</th></tr></thead><tbody>${active.sort((a,b)=>calcEndDate(a.startDate,a.duration)>calcEndDate(b.startDate,b.duration)?1:-1).slice(0,5).map(p=>{
        const e=calcEndDate(p.startDate,p.duration), r=calcDaysRemaining(e);
        return `<tr style="cursor:pointer" onclick="openProjectDetail(${projects.indexOf(p)})"><td><b>${lang==='en'?p.name:p.nameAr}</b></td><td>${e}</td><td><span style="font-weight:700;color:${r<0?'var(--red)':'var(--blue)'};">${p.progress}%</span></td><td>${r!==null?(r<0?Math.abs(r)+(lang==='en'?' over':'تأخير'):r):'—'}</td></tr>`;
      }).join('')}</tbody></table>` : '<div class="empty-state">'+ICONS.box+'<div>'+(lang==='en'?'No active projects':'لا توجد مشاريع نشطة')+'</div></div>'}
    </div>
    <div class="card"><div class="card-head"><div class="card-title">${L.overdueList}</div></div>
      ${overdue.length ? overdue.slice(0,5).map(p=>`<div class="alert-row" style="background:var(--red-soft);border:1px solid var(--red);cursor:pointer;" onclick="openProjectDetail(${projects.indexOf(p)})">
        <div class="alert-icon" style="background:var(--red-soft);color:var(--red);">${ICONS.flag}</div>
        <div class="alert-mid"><div class="alert-name">${lang==='en'?p.name:p.nameAr}</div></div>
        <span style="font-size:11px;font-weight:700;color:var(--red);">${Math.abs(calcDaysRemaining(calcEndDate(p.startDate,p.duration)))} ${lang==='en'?'days':'أيام'}</span>
      </div>`).join('') : '<div class="empty-state">'+ICONS.flag+'<div>'+(lang==='en'?'No overdue projects':'لا توجد مشاريع متأخرة')+'</div></div>'}
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;">
    ${projects.map(p=>{
      const e=calcEndDate(p.startDate,p.duration), r=calcDaysRemaining(e);
      const col=r!==null?(r<0?'var(--red)':r<30?'var(--amber)':'var(--green)'):'var(--text-2)';
      return `<div class="stat-card" style="padding:14px;cursor:pointer;" onclick="openProjectDetail(${projects.indexOf(p)})">
        <div class="stat-top"><div class="stat-label">${p.id}</div><span class="pill ${getProjStatusClass(p.status)}">${getProjStatusLabel(p.status)}</span></div>
        <div style="font-size:14px;font-weight:700;margin:4px 0;">${lang==='en'?p.name:p.nameAr}</div>
        <div style="display:flex;align-items:center;gap:6px;margin:6px 0;">
          <div style="flex:1;height:6px;background:var(--surface-2);border-radius:3px;"><div style="width:${p.progress}%;height:100%;background:${col};border-radius:3px;"></div></div>
          <span style="font-size:11px;font-weight:700;color:${col};">${p.progress}%</span>
        </div>
        <div style="font-size:11px;color:var(--text-2);">${r!==null?(r<0?Math.abs(r)+(lang==='en'?' days overdue':' أيام تأخير'):r+' '+L.daysRemaining):(lang==='en'?'No deadline':'لا يوجد موعد')}</div>
      </div>`;
    }).join('')}
  </div>
  <div style="margin-top:16px;"><canvas id="projChart" height="80"></canvas></div>`;
}

function renderProjectsList(){
  const L = STR[lang].projects;
  const sv = (document.getElementById('projSearch')?.value||'').toLowerCase();
  const sf = document.getElementById('projStatusFilter')?.value||'';
  const pf = document.getElementById('projPriorityFilter')?.value||'';
  const filtered = projects.filter(p=>{
    const n=(lang==='en'?p.name:p.nameAr).toLowerCase(), c=(lang==='en'?p.client:p.clientAr).toLowerCase();
    if(sv && !n.includes(sv) && !c.includes(sv) && !p.id.toLowerCase().includes(sv)) return false;
    if(sf && p.status!==sf) return false;
    if(pf && p.priority!==pf) return false;
    return true;
  });
  return `
  <div class="toolbar">
    <button class="btn btn-primary" id="newProjBtn">${ICONS.plus} ${L.newProject}</button>
    <button class="btn" id="projFilterBtn">${ICONS.filter} ${L.filter}</button>
    <div class="table-search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg><input id="projSearch" placeholder="${L.searchProjects}"></div>
  </div>
  <div class="filter-panel" id="projFilterPanel">
    <div class="field"><label>${L.status}</label><select id="projStatusFilter"><option value="">${L.allStatus}</option>${PROJECT_STATUSES.map(s=>`<option value="${s}">${getProjStatusLabel(s)}</option>`).join('')}</select></div>
    <div class="field"><label>${L.priority}</label><select id="projPriorityFilter"><option value="">${L.allPriority}</option>${PROJECT_PRIORITIES.map(s=>`<option value="${s}">${getPriorityLabel(s)}</option>`).join('')}</select></div>
    <button class="btn-mini" id="projFilterApply">${L.filter}</button>
    <button class="btn-mini" id="projFilterReset" style="background:var(--surface-2);color:var(--text);">${lang==='en'?'Reset':'إعادة'}</button>
  </div>
  <div class="table-card"><table><thead><tr><th>${L.projectNumber}</th><th>${L.projectName}</th><th>${L.client}</th><th>${L.type}</th><th>${L.manager}</th><th>${L.contractValue}</th><th>${L.progress}</th><th>${L.status}</th><th>${L.priority}</th><th>${lang==='en'?'Actions':'إجراءات'}</th></tr></thead><tbody>
  ${filtered.length ? filtered.map(p=>{
    const idx=projects.indexOf(p), e=calcEndDate(p.startDate,p.duration), r=calcDaysRemaining(e);
    return `<tr>
      <td><b>${p.id}</b></td><td>${lang==='en'?p.name:p.nameAr}</td><td>${lang==='en'?p.client:p.clientAr}</td><td>${lang==='en'?p.type:p.typeAr}</td>
      <td>${p.manager}</td><td style="font-weight:700;color:var(--blue);">SAR ${p.contractValue.toLocaleString('en',{minimumFractionDigits:0})}</td>
      <td><div style="display:flex;align-items:center;gap:6px;"><div style="flex:1;height:5px;background:var(--surface-2);border-radius:3px;"><div style="width:${p.progress}%;height:100%;background:${r<0?'var(--red)':p.progress>=80?'var(--green)':'var(--blue)'};border-radius:3px;"></div></div><span style="font-size:11px;font-weight:700;">${p.progress}%</span></div></td>
      <td><span class="pill ${getProjStatusClass(p.status)}" onclick="toggleProjectStatus(${idx})" style="cursor:pointer;">${getProjStatusLabel(p.status)}</span></td>
      <td><span class="pill ${getPriorityClass(p.priority)}">${getPriorityLabel(p.priority)}</span></td>
      <td><div class="row-actions"><button title="${lang==='en'?'View':'عرض'}" onclick="openProjectDetail(${idx})">${ICONS.eye}</button><button title="${lang==='en'?'Edit':'تعديل'}" onclick="openProjectModal(${idx})">${ICONS.edit}</button><button title="${lang==='en'?'Delete':'حذف'}" onclick="deleteProject(${idx})">${ICONS.trash}</button></div></td>
    </tr>`;
  }).join('') : `<tr><td colspan="10"><div class="empty-state">${ICONS.box}<div>${L.noData}</div></div></td></tr>`}
  </tbody></table></div>`;
}

/* ── Project Detail ── */
function openProjectDetail(idx){
  currentProjectIdx = idx;
  const p = projects[idx]; if(!p) return;
  const L = STR[lang].projects;
  const end = calcEndDate(p.startDate, p.duration);
  const remain = calcDaysRemaining(end);
  let detailTab = 'info';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.id = 'projDetailOverlay';
  overlay.style.cssText = 'z-index:2000;overflow-y:auto;';
  overlay.onclick = e => { if(e.target===overlay) { overlay.remove(); refreshProjectsPageIfNeeded(); } };
  const tabs = [
    {key:'info',label:lang==='en'?'Project Info':'معلومات المشروع'},{key:'phases',label:L.phases},{key:'materials',label:L.materials},
    {key:'purchases',label:L.purchases},{key:'team',label:L.team},{key:'docs',label:L.documents},
    {key:'gallery',label:L.gallery},{key:'notes',label:L.activityLog},{key:'risks',label:L.risks},
  ];
  overlay.innerHTML = `
    <div class="modal" style="max-width:92vw;width:92vw;max-height:92vh;overflow-y:auto;margin:10px auto;padding:0;border-radius:16px;">
      <div style="background:linear-gradient(135deg,#0A66FF,#1E40AF);color:#fff;padding:24px 28px;border-radius:16px 16px 0 0;display:flex;justify-content:space-between;align-items:flex-start;">
        <div><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <h2 style="margin:0;font-size:18px;font-weight:800;">${lang==='en'?p.name:p.nameAr}</h2>
          <span class="pill" style="background:rgba(255,255,255,.2);color:#fff;">${p.id}</span>
          <span class="pill" style="background:rgba(255,255,255,.2);color:#fff;">${getProjStatusLabel(p.status)}</span>
        </div><p style="margin:6px 0 0;font-size:13px;opacity:.85;">${lang==='en'?p.client:p.clientAr} · ${lang==='en'?p.type:p.typeAr}</p></div>
        <div style=\"display:flex;align-items:center;gap:8px;\">
          <button id=\"projSyncNowBtn\" title=\"Sync now / مزامنة الآن\" style=\"background:rgba(255,255,255,.2);border:none;color:#fff;padding:0 12px;height:32px;border-radius:16px;cursor:pointer;font-size:12px;font-weight:700;\">${lang==='en'?'Sync now':'مزامنة الآن'}</button>
          <button onclick="this.closest('.modal-overlay').remove();refreshProjectsPageIfNeeded()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:18px;">✕</button>
        </div>
      </div>
      <div style="padding:20px 28px;">
        <div class="report-tabs" style="margin-bottom:16px;gap:4px;">${tabs.map(t => `<span class="report-tab${detailTab===t.key?' active':''}" data-dtab="${t.key}" style="font-size:11.5px;padding:7px 12px;">${t.label}</span>`).join('')}</div>
        <div id="projDetailBody">${renderProjInfoTab(p, L, end, remain)}</div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(() => {
    const syncBtn = document.getElementById('projSyncNowBtn');
    if(syncBtn){
      syncBtn.addEventListener('click', function(){
        if(!window.StockFlowBackend || !window.StockFlowBackend.enabled){
          showToast(lang==='en'?'Not connected to Supabase (demo mode).':'غير متصل بـ Supabase (وضع تجريبي).');
          return;
        }
        syncCurrentProject();
        showToast(lang==='en'?'Project synced!':'تمت مزامنة المشروع!');
      });
    }
    overlay.querySelectorAll('[data-dtab]').forEach(tab => {
      tab.addEventListener('click', function(){
        detailTab = this.dataset.dtab;
        const body = document.getElementById('projDetailBody'); if(!body) return;
        const map = {
          info: renderProjInfoTab(p, L, end, remain),
          phases: renderProjPhasesTab(p, idx, L),
          materials: renderProjMaterialsTab(p, idx, L),
          purchases: renderProjPurchasesTab(p, idx, L),
          team: renderProjTeamTab(p, idx, L),
          docs: renderProjDocsTab(p, idx, L),
          gallery: renderProjGalleryTab(p, idx, L),
          notes: renderProjNotesTab(p, idx, L),
          risks: renderProjRisksTab(p, idx, L),
        };
        body.innerHTML = map[detailTab] || '';
        overlay.querySelectorAll('[data-dtab]').forEach(t => t.classList.toggle('active', t.dataset.dtab === detailTab));
      });
    });
  }, 50);
}

function renderProjInfoTab(p, L, end, remain){
  return `<div class="row-2" style="grid-template-columns:1fr 1fr;">
    <div class="card" style="margin-bottom:0;"><div class="card-head"><div class="card-title">${lang==='en'?'General Info':'معلومات عامة'}</div></div>
      <div class="proj-info-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px;">${[
        [L.projectName, lang==='en'?p.name:p.nameAr],[L.client, lang==='en'?p.client:p.clientAr],[L.type, lang==='en'?p.type:p.typeAr],
        [L.location, lang==='en'?p.location:p.locationAr],[L.coordinates, p.coords],[L.contractNo, p.contractNo],
        [L.contractValue, 'SAR '+p.contractValue.toLocaleString('en',{minimumFractionDigits:2})],[L.contractDate, p.contractDate],
        [L.startDate, p.startDate],[L.duration, p.duration+' '+(lang==='en'?'days':'يوم')],[L.endDate, end],
        [L.manager, p.manager],[L.engineer, p.engineer],
      ].map(([k,v]) => `<div><span style="color:var(--text-2);font-size:11px;font-weight:600;">${k}</span><div style="font-weight:600;margin-top:2px;">${v||'—'}</div></div>`).join('')}</div>
    </div>
    <div><div class="card" style="margin-bottom:12px;"><div class="card-head"><div class="card-title">${L.progress}</div></div>
      <div style="margin:10px 0;"><div style="height:12px;background:var(--surface-2);border-radius:6px;"><div style="width:${p.progress}%;height:100%;background:${remain<0?'var(--red)':p.progress>=80?'var(--green)':'var(--blue)'};border-radius:6px;"></div></div></div>
      <div style="display:flex;justify-content:space-between;font-size:12px;"><span>${p.progress}% ${lang==='en'?'Complete':'مكتمل'}</span><span style="color:${remain<0?'var(--red)':'var(--text-2)'};">${remain!==null?(remain<0?Math.abs(remain)+(lang==='en'?' days overdue':' أيام تأخير'):remain+' '+L.daysRemaining):'—'}</span></div>
    </div>
    <div class="card" style="margin-bottom:0;"><div class="card-head"><div class="card-title">${L.notes}</div></div><p style="font-size:13px;color:var(--text-2);margin:0;">${lang==='en'?p.notes:p.notesAr||'—'}</p></div></div>
  </div>`;
}

function renderProjPhasesTab(p, idx, L){
  return `<div class="table-card"><table><thead><tr><th>${L.phase}</th><th>${L.startDatePhase}</th><th>${L.endDatePhase}</th><th>${L.responsible}</th><th>${L.progress}</th><th>${L.phaseStatus}</th><th>${lang==='en'?'Notes':'ملاحظات'}</th><th>${lang==='en'?'Actions':'إجراءات'}</th></tr></thead><tbody>${p.phases.map((ph, pi) => `<tr style="${ph.status==='inProgress'?'background:var(--blue-soft);':''}">
    <td><input class="phase-inline" value="${ph.name||getPhaseLabel(ph.id)}" placeholder="${lang==='en'?'Phase Name':'اسم المرحلة'}" onchange="updatePhaseField(${idx},${pi},'name',this.value)" style="font-weight:700;max-width:120px;width:80px;"></td>
    <td><input type="date" class="phase-inline" value="${ph.start||''}" onchange="updatePhaseField(${idx},${pi},'start',this.value)"></td>
    <td><input type="date" class="phase-inline" value="${ph.end||''}" onchange="updatePhaseField(${idx},${pi},'end',this.value)"></td>
    <td><input class="phase-inline" value="${ph.resp||''}" placeholder="${lang==='en'?'Name':'الاسم'}" onchange="updatePhaseField(${idx},${pi},'resp',this.value)" style="max-width:120px;width:80px;"></td>
    <td><div style="display:flex;align-items:center;gap:6px;"><div style="flex:1;height:5px;background:var(--surface-2);border-radius:3px;"><div style="width:${getPhaseProgressFromStatus(ph.status)}%;height:100%;background:${ph.status==='completed'?'var(--green)':ph.status==='inProgress'||ph.status==='delayed'?'var(--blue)':'var(--surface-2)'};border-radius:3px;"></div></div><span style="font-size:11px;font-weight:700;">${getPhaseProgressFromStatus(ph.status)}%</span></div></td>
    <td><select class="phase-inline" onchange="updatePhaseField(${idx},${pi},'status',this.value)">${['notStarted','inProgress','completed','delayed'].map(s => `<option value="${s}"${ph.status===s?' selected':''}>${getPhaseStatusLabel(s)}</option>`).join('')}</select></td>
    <td><input class="phase-inline" value="${lang==='en'?ph.notes:ph.notesAr||''}" placeholder="${lang==='en'?'Notes':'ملاحظات'}" onchange="updatePhaseField(${idx},${pi},'notes',this.value)" style="max-width:130px;width:90px;"></td>
    <td><div class="row-actions"><button title="${lang==='en'?'Delete':'حذف'}" onclick="deletePhase(${idx},${pi})">${ICONS.trash}</button></div></td>
  </tr>`).join('')}</tbody></table></div><div style="margin-top:8px;display:flex;gap:8px;justify-content:space-between;"><button class="btn-mini" onclick="showAddPhaseModal(${idx})">+ ${lang==='en'?'Add Phase':'إضافة مرحلة'}</button><button class="btn-mini" onclick="savePhases(${idx})">${lang==='en'?'Save Changes':'حفظ التغييرات'}</button></div>`;
}

function renderProjMaterialsTab(p, idx, L){
  const total = p.materials.length;
  const prov = p.materials.filter(m=>m.status==='provided').length;
  const ordered = p.materials.filter(m=>m.status==='ordered').length;
  const na = p.materials.filter(m=>m.status==='notAvailable').length;
  const pct = total ? Math.round(prov/total*100) : 0;
  return `<div class="report-kpis" style="margin-bottom:12px;">
    <div class="report-kpi"><span class="report-kpi-label">${L.totalMaterials}</span><span class="report-kpi-value">${total}</span></div>
    <div class="report-kpi"><span class="report-kpi-label">${L.provided}</span><span class="report-kpi-value" style="color:var(--green);">${prov}</span></div>
    <div class="report-kpi"><span class="report-kpi-label">${L.onOrder}</span><span class="report-kpi-value" style="color:var(--amber);">${ordered}</span></div>
    <div class="report-kpi"><span class="report-kpi-label">${L.notAvailable}</span><span class="report-kpi-value" style="color:var(--red);">${na}</span></div>
  </div>
  <div style="margin-bottom:12px;"><div style="height:8px;background:var(--surface-2);border-radius:4px;"><div style="width:${pct}%;height:100%;background:var(--green);border-radius:4px;"></div></div><span style="font-size:11px;color:var(--text-2);">${pct}% ${lang==='en'?'provided':'متوفرة'}</span></div>
  <div style="margin-bottom:12px;display:flex;gap:8px;"><button class="btn-mini" onclick="addProjectMaterial(${idx})">+ ${L.addMaterial}</button><button class="btn-mini" style="background:var(--green);">${L.importExcel}</button></div>
  ${total ? `<div class="table-card"><table><thead><tr><th>${L.materialName}</th><th>${L.qtyRequired}</th><th>${L.qtyIssued}</th><th>${L.qtyRemaining}</th><th>${L.materialStatus}</th><th>${lang==='en'?'Actions':'إجراءات'}</th></tr></thead><tbody>${p.materials.map(m => `<tr>
    <td>${lang==='en'?m.name:m.nameAr}</td><td>${m.qtyReq}</td><td>${m.qtyIssued}</td><td>${m.qtyRemaining}</td>
    <td><span class="pill ${m.status==='provided'?'pill-ok':m.status==='ordered'?'pill-low':'pill-critical'}">${m.status==='provided'?L.statusProvided:m.status==='ordered'?L.statusOrdered:L.statusNotAvailable}</span></td>
    <td><div class="row-actions"><button title="${lang==='en'?'Edit':'تعديل'}" onclick="editProjectMaterial(${idx},${JSON.stringify(m.id)})">${ICONS.edit}</button><button title="${lang==='en'?'Delete':'حذف'}" onclick="deleteProjectMaterial(${idx},${JSON.stringify(m.id)})">${ICONS.trash}</button></div></td>
  </tr>`).join('')}</tbody></table></div>` : '<div class="empty-state">'+ICONS.box+'<div>'+L.noMaterials+'</div></div>'}`;
}

function renderProjPurchasesTab(p, idx, L){
  const pos = p.poRefs||[];
  return `<div style="margin-bottom:12px;"><button class="btn-mini" onclick="showAddPOModal(${idx})">+ ${lang==='en'?'Add PO':'إضافة أمر شراء'}</button></div><div class="table-card"><table><thead><tr><th>${L.poNumber}</th><th>${L.supplier}</th><th>${L.orderValue}</th><th>${L.orderDate}</th><th>${L.deliveryDate}</th><th>${L.orderStatus}</th><th>${lang==='en'?'Actions':'إجراءات'}</th></tr></thead><tbody>${pos.length ? pos.map((po,pi) => `<tr><td>${po.id}</td><td>${po.supplier}</td><td>SAR ${(po.value||0).toLocaleString('en',{minimumFractionDigits:2})}</td><td>${po.date||'—'}</td><td>${po.delivery||'—'}</td><td><span class="pill ${(po.status||'pending')==='approved'?'pill-ok':'pill-low'}">${po.status||'—'}</span></td><td><div class="row-actions"><button title="${lang==='en'?'Delete':'حذف'}" onclick="deleteProjectPO(${idx},${pi})">${ICONS.trash}</button></div></td></tr>`).join('') : `<tr><td colspan="7"><div class="empty-state">${ICONS.purchase}<div>${lang==='en'?'No purchase orders linked':'لا توجد أوامر شراء'}</div></div></td></tr>`}</tbody></table></div>`;
}

function renderProjTeamTab(p, idx, L){
  return `<div style="margin-bottom:12px;"><button class="btn-mini" onclick="showAddTeamModal(${idx})">+ ${L.addMember}</button></div>${p.team.length ? `<div class="table-card"><table><thead><tr><th>${L.teamMember}</th><th>${L.role}</th><th>${lang==='en'?'Actions':'إجراءات'}</th></tr></thead><tbody>${p.team.map((m,i) => `<tr><td>${m.name}</td><td>${lang==='en'?m.role:m.roleAr}</td><td><div class="row-actions"><button title="${lang==='en'?'Delete':'حذف'}" onclick="deleteProjectTeamMember(${idx},${i})">${ICONS.trash}</button></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state">'+ICONS.users+'<div>'+L.noTeam+'</div></div>'}`;
}

function renderProjDocsTab(p, idx, L){
  const fileIcon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>';
  return `<div style="margin-bottom:12px;"><button class="btn-mini" onclick="showAddDocModal(${idx})">+ ${L.addDocument}</button></div>${p.docs.length ? `<div class="table-card"><table><thead><tr><th>${L.documentName}</th><th>${L.docType}</th><th>${lang==='en'?'File':'الملف'}</th><th>${L.uploadDate}</th><th>${lang==='en'?'Actions':'إجراءات'}</th></tr></thead><tbody>${p.docs.map((d,i) => `<tr><td>${escapeHtml(d.name)}</td><td><span class="cat-tag">${escapeHtml(d.type)}</span></td><td>${d.url ? `<a href="${escapeHtml(d.url)}" download="${escapeHtml(d.file||d.name)}" style="color:var(--blue);text-decoration:none;display:inline-flex;align-items:center;gap:4px;font-weight:600;">${fileIcon}${escapeHtml(d.file)||(lang==='en'?'View':'عرض')}</a>` : '<span style="color:var(--text-3);">—</span>'}</td><td>${d.date}</td><td><div class="row-actions"><button title="${lang==='en'?'Delete':'حذف'}" onclick="deleteProjectDoc(${idx},${i})">${ICONS.trash}</button></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state">'+ICONS.inbox+'<div>'+L.noDocs+'</div></div>'}`;
}

function renderProjGalleryTab(p, idx, L){
  const cats = [{key:'before',label:L.beforeExec},{key:'during',label:L.duringExec},{key:'after',label:L.afterExec}];
  return `<div style="margin-bottom:12px;"><button class="btn-mini" onclick="showAddImageModal(${idx})">+ ${L.addImage}</button></div>${cats.map(c => {
    const imgs = p.images.filter(i=>i.cat===c.key);
    return `<div class="card" style="margin-bottom:12px;"><div class="card-head"><div class="card-title">${c.label}</div></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">${imgs.length ? imgs.map((img,imgIdx)=>`<div style="width:150px;height:120px;background:var(--surface-2);border-radius:10px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;font-size:11px;color:var(--text-2);position:relative;"><button onclick="deleteProjectImage(${idx},${projects[idx].images.indexOf(img)})" style="position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;border:none;background:rgba(0,0,0,0.4);color:#fff;cursor:pointer;font-size:12px;line-height:1;display:flex;align-items:center;justify-content:center;">✕</button><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg><span>${img.desc||'—'}</span></div>`).join('') : '<span style="font-size:12px;color:var(--text-3);">'+(lang==='en'?'No images':'لا توجد صور')+'</span>'}</div></div>`;
  }).join('')}`;
}

function renderProjNotesTab(p, idx, L){
  return `<div style="margin-bottom:12px;"><div style="display:flex;gap:8px;"><input id="projNoteInput" placeholder="${L.addNote}..." style="flex:1;padding:8px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface-2);color:var(--text);"><button class="btn-mini" onclick="addProjectNote(${idx})">${lang==='en'?'Add':'إضافة'}</button></div></div>
  ${p.notesLog.length ? `<div style="max-height:400px;overflow-y:auto;">${[...p.notesLog].reverse().map(n=>`<div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);">
    <div style="width:32px;height:32px;border-radius:50%;background:var(--blue-soft);color:var(--blue);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;">${(n.user||'U')[0].toUpperCase()}</div>
    <div style="flex:1;"><div style="font-size:13px;">${lang==='en'?n.text:n.textAr||n.text}</div><div style="font-size:11px;color:var(--text-3);margin-top:2px;">${n.user||'—'} · ${n.date||'—'}</div></div>
  </div>`).join('')}</div>` : '<div class="empty-state">'+ICONS.inbox+'<div>'+L.noNotes+'</div></div>'}`;
}

function renderProjRisksTab(p, idx, L){
  return `<div style="margin-bottom:12px;"><button class="btn-mini" onclick="showAddRiskModal(${idx})">+ ${L.addRisk}</button></div>${p.risks.length ? `<div class="table-card"><table><thead><tr><th>${L.riskName}</th><th>${L.riskLevel}</th><th>${L.status}</th><th>${lang==='en'?'Date':'التاريخ'}</th><th>${lang==='en'?'Actions':'إجراءات'}</th></tr></thead><tbody>${p.risks.map((r,i)=>`<tr><td>${lang==='en'?r.name:r.nameAr}</td><td><span class="pill ${r.level==='high'?'pill-critical':r.level==='medium'?'pill-low':'pill-ok'}">${r.level}</span></td><td><span class="pill ${r.status==='active'?'pill-low':'pill-ok'}">${r.status}</span></td><td>${r.date||'—'}</td><td><div class="row-actions"><button title="${lang==='en'?'Delete':'حذف'}" onclick="deleteProjectRisk(${idx},${i})">${ICONS.trash}</button></div></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state">'+ICONS.flag+'<div>'+L.noRisks+'</div></div>'}`;
}

/* ── Shared notification generator ── */
function getNotifItems(){
  const L = STR[lang];
  const today = new Date();
  const items = [];
  // delayed/overdue projects
  projects.forEach(p => {
    if(p.status==='completed'||p.status==='cancelled'||p.status==='onHold') return;
    const end = calcEndDate(p.startDate, p.duration);
    const remain = calcDaysRemaining(end);
    if(remain !== null && remain < 0){
      const overdue = Math.abs(remain);
      items.push({
        icon:ICONS.clock, c:'var(--red)', bg:'var(--red-soft)',
        title: `${lang==='en'?p.id:p.id} — ${lang==='en'?p.name:p.nameAr} (${overdue} ${lang==='en'?'d overdue':'يوم تأخير'})`,
        time: `${overdue}d`
      });
    }
    // delayed phases
    (p.phases||[]).forEach(ph => {
      if(ph.status==='delayed'){
        items.push({
          icon:ICONS.issue, c:'var(--amber)', bg:'var(--amber-soft)',
          title: `${lang==='en'?p.id:p.id} · ${lang==='en'? (ph.name||ph.id) : (ph.nameAr||ph.id)} ${lang==='en'?'delayed':'متأخر'}`,
          time: '!'
        });
      }
    });
  });
  // low stock items (top 2)
  inventoryData.filter(i=>i.stock<i.min).slice(0,2).forEach(i => {
    items.push({
      icon:ICONS.flag, c:'var(--red)', bg:'var(--red-soft)',
      title: `${lang==='en'?i.name:i.nameAr} (${i.sku}) ${L.notif.lowStockMsg}`,
      time: '—'
    });
  });
  // pending approvals (mock)
  items.push({
    icon:ICONS.issue, c:'var(--blue)', bg:'var(--blue-soft)',
    title: 'REQ-551 '+L.notif.approvalMsg, time: '1h'
  });
  return items;
}
/* ── Project Modal ── */
function openProjectModal(idx=null){
  const isEdit = idx !== null;
  const p = isEdit ? projects[idx] : null;
  const L = STR[lang].projects;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.style.cssText = 'z-index:2000;';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="modal modal-xl">
      <h3>${isEdit ? L.editProject : L.newProject}</h3>
      <div class="field-row"><div class="field"><label>${L.projectNumber}</label><input id="pmId" value="${p?p.id:''}" placeholder="${isEdit?'':lang==='en'?'Auto: PRJ-00'+projCounter:'تلقائي: PRJ-00'+projCounter}"></div><div class="field"></div></div>
      <div class="field-row"><div class="field"><label>${L.projectName} (EN)</label><input id="pmName" value="${p?p.name:''}"></div><div class="field"><label>${L.projectName} (AR)</label><input id="pmNameAr" value="${p?p.nameAr:''}"></div></div>
      <div class="field-row"><div class="field"><label>${L.client} (EN)</label><input id="pmClient" value="${p?p.client:''}"></div><div class="field"><label>${L.client} (AR)</label><input id="pmClientAr" value="${p?p.clientAr:''}"></div></div>
      <div class="field-row"><div class="field"><label>${L.type} (EN)</label><input id="pmType" value="${p?p.type:''}"></div><div class="field"><label>${L.type} (AR)</label><input id="pmTypeAr" value="${p?p.typeAr:''}"></div></div>
      <div class="field-row"><div class="field"><label>${L.location} (EN)</label><input id="pmLoc" value="${p?p.location:''}"></div><div class="field"><label>${L.location} (AR)</label><input id="pmLocAr" value="${p?p.locationAr:''}"></div></div>
      <div class="field-row"><div class="field"><label>${L.coordinates}</label><input id="pmCoords" value="${p?p.coords:''}" placeholder="e.g. 26.42N, 50.08E"></div><div class="field"><label>${L.manager}</label><input id="pmManager" value="${p?p.manager:''}"></div></div>
      <div class="field-row"><div class="field"><label>${L.engineer}</label><input id="pmEngineer" value="${p?p.engineer:''}"></div><div class="field"><label>${L.contractNo}</label><input id="pmContractNo" value="${p?p.contractNo:''}"></div></div>
      <div class="field-row"><div class="field"><label>${L.contractValue} (SAR)</label><input type="number" id="pmContractValue" value="${p?p.contractValue:''}"></div><div class="field"><label>${L.contractDate}</label><input type="date" id="pmContractDate" value="${p?p.contractDate:''}"></div></div>
      <div class="field-row"><div class="field"><label>${L.startDate}</label><input type="date" id="pmStartDate" value="${p?p.startDate:''}"></div><div class="field"><label>${L.duration} (${lang==='en'?'days':'أيام'})</label><input type="number" id="pmDuration" value="${p?p.duration:''}"></div></div>
      <div class="field-row"><div class="field"><label>${L.status}</label><select id="pmStatus">${PROJECT_STATUSES.map(s=>`<option value="${s}"${p&&p.status===s?' selected':''}>${getProjStatusLabel(s)}</option>`).join('')}</select></div>
      <div class="field"><label>${L.priority}</label><select id="pmPriority">${PROJECT_PRIORITIES.map(pr=>`<option value="${pr}"${p&&p.priority===pr?' selected':''}>${getPriorityLabel(pr)}</option>`).join('')}</select></div></div>
      <div class="field"><label>${L.notes} (EN)</label><textarea id="pmNotes" rows="2">${p?p.notes||'':''}</textarea></div>
      <div class="field"><label>${L.notes} (AR)</label><textarea id="pmNotesAr" rows="2">${p?p.notesAr||'':''}</textarea></div>
      <div class="modal-actions"><button class="btn" onclick="this.closest('.modal-overlay').remove()">${lang==='en'?'Cancel':'إلغاء'}</button><button class="btn btn-primary" id="pmSaveBtn">${isEdit?(lang==='en'?'Save':'حفظ'):(lang==='en'?'Create Project':'إنشاء المشروع')}</button></div>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('pmSaveBtn')?.addEventListener('click', ()=> saveProject(idx)), 50);
}

function saveProject(idx){
  const get = id => document.getElementById(id)?.value?.trim() || '';
  const name = get('pmName'), nameAr = get('pmNameAr');
  if(!name && !nameAr) return showToast(lang==='en'?'Project name is required':'اسم المشروع مطلوب');
  const pid = get('pmId');
  if(idx !== null){
    const p = projects[idx];
    if(pid) p.id = pid;
    p.name = name||p.name; p.nameAr = nameAr||p.nameAr;
    p.client = get('pmClient')||p.client; p.clientAr = get('pmClientAr')||p.clientAr;
    p.type = get('pmType')||p.type; p.typeAr = get('pmTypeAr')||p.typeAr;
    p.location = get('pmLoc')||p.location; p.locationAr = get('pmLocAr')||p.locationAr;
    p.coords = get('pmCoords')||p.coords; p.manager = get('pmManager')||p.manager;
    p.engineer = get('pmEngineer')||p.engineer; p.contractNo = get('pmContractNo')||p.contractNo;
    p.contractValue = parseFloat(get('pmContractValue'))||p.contractValue;
    p.contractDate = get('pmContractDate')||p.contractDate; p.startDate = get('pmStartDate')||p.startDate;
    p.duration = parseInt(get('pmDuration'))||p.duration;
    p.status = get('pmStatus')||p.status; p.priority = get('pmPriority')||p.priority;
    p.notes = get('pmNotes')||p.notes; p.notesAr = get('pmNotesAr')||p.notesAr;
  } else {
    projects.push({
      id: pid || nextProjectId(),
      name, nameAr, client:get('pmClient'), clientAr:get('pmClientAr'),
      type:get('pmType'), typeAr:get('pmTypeAr'), location:get('pmLoc'), locationAr:get('pmLocAr'),
      coords:get('pmCoords'), manager:get('pmManager'), engineer:get('pmEngineer'),
      contractNo:get('pmContractNo'), contractFile:'', contractValue:parseFloat(get('pmContractValue'))||0,
      contractDate:get('pmContractDate'), startDate:get('pmStartDate'), duration:parseInt(get('pmDuration'))||30,
      progress:0, status:get('pmStatus')||'active', priority:get('pmPriority')||'medium',
      notes:get('pmNotes'), notesAr:get('pmNotesAr'),
      phases: defaultPhases.map(dp => ({id:dp.id, name:dp.name, nameAr:dp.nameAr, status:'notStarted', start:'', end:'', resp:'', notes:'', notesAr:'', progress:0})),
      materials:[], team:[], docs:[], images:[], notesLog:[{text:'Project created',textAr:'تم إنشاء المشروع',user:'admin',date:new Date().toISOString().split('T')[0]}], risks:[], issueOrders:[], poRefs:[],
    });
  }
  showToast(lang==='en'?'Project saved!':'تم حفظ المشروع!');
  document.querySelectorAll('.modal-overlay.show').forEach(m => m.remove());
  navigate('projects');
}

async function deleteProject(idx){
  const ok = await showConfirm(lang==='en'?'Are you sure you want to delete this project?':'هل أنت متأكد من حذف هذا المشروع؟');
  if(ok){ projects.splice(idx, 1); navigate('projects'); }
}

function addProjectNote(idx){
  const p = projects[idx]; if(!p) return;
  const inp = document.getElementById('projNoteInput');
  if(!inp||!inp.value.trim()) return;
  p.notesLog = p.notesLog||[];
  p.notesLog.push({text:inp.value.trim(), textAr:inp.value.trim(), user:'admin', date:new Date().toISOString().split('T')[0]});
  syncCurrentProject();
  inp.value = '';
  const body = document.getElementById('projDetailBody');
  if(body) body.innerHTML = renderProjNotesTab(p, idx, STR[lang].projects);
}
function editProjectMaterial(idx, mid){
  const p = projects[idx]; if(!p) return;
  const m = p.materials.find(x=>x.id===mid); if(!m) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.style.cssText = 'z-index:9999;';
  overlay.onclick = e => { if(e.target===overlay) overlay.remove(); };
  overlay.innerHTML = `<div class="modal" style="max-width:400px;"><h3>${lang==='en'?'Edit Material':'تعديل المادة'}</h3>
    <div class="field"><label>${lang==='en'?'Qty Required':'الكمية المطلوبة'}</label><input type="number" id="editMatQty" value="${m.qtyReq}"></div>
    <div class="field"><label>${lang==='en'?'Status':'الحالة'}</label><select id="editMatStatus"><option value="provided" ${m.status==='provided'?' selected':''}>${lang==='en'?'Provided':'متوفرة'}</option><option value="ordered" ${m.status==='ordered'?' selected':''}>${lang==='en'?'Ordered':'مطلوبة'}</option><option value="notAvailable" ${m.status==='notAvailable'?' selected':''}>${lang==='en'?'Not Available':'غير متوفرة'}</option></select></div>
    <div class="modal-actions"><button class="btn" onclick="this.closest('.modal-overlay').remove()">${lang==='en'?'Cancel':'إلغاء'}</button><button class="btn btn-primary" id="editMatSave">${lang==='en'?'Save':'حفظ'}</button></div></div>`;
  document.body.appendChild(overlay);
  setTimeout(()=>{
    document.getElementById('editMatSave')?.addEventListener('click', ()=>{
      m.qtyReq = parseInt(document.getElementById('editMatQty')?.value)||m.qtyReq;
      m.status = document.getElementById('editMatStatus')?.value||m.status;
      overlay.remove();
      const existing = document.getElementById('projDetailOverlay');
      if(existing) existing.remove();
      openProjectDetail(idx);
    });
  }, 50);
}
function toggleProjectStatus(idx){
  const p = projects[idx]; if(!p) return;
  const cur = PROJECT_STATUSES.indexOf(p.status);
  p.status = PROJECT_STATUSES[(cur+1) % PROJECT_STATUSES.length];
  if(currentPage === 'projects') navigate('projects');
}
function refreshProjectsPageIfNeeded(){
  if(currentPage === 'projects') navigate('projects');
}
function deleteProjectMaterial(idx, mid){
  const p = projects[idx]; if(!p) return;
  p.materials = p.materials.filter(x=>x.id!==mid);
  const body = document.getElementById('projDetailBody');
  if(body) body.innerHTML = renderProjMaterialsTab(p, idx, STR[lang].projects);
}
function withModalOverlay(html){
  const o = document.createElement('div');
  o.className = 'modal-overlay show';
  o.style.cssText = 'z-index:9999;';
  o.onclick = e => { if(e.target===o) o.remove(); };
  o.innerHTML = `<div class="modal" style="max-width:400px;">${html}</div>`;
  document.body.appendChild(o);
  return o;
}
function showAddTeamModal(idx){
  const p = projects[idx]; if(!p) return;
  const L = STR[lang].projects;
  const ROLE_OPTS = [{v:'manager',l:lang==='en'?'Project Manager':'مدير مشروع'},{v:'engineer',l:lang==='en'?'Engineer':'مهندس'},{v:'supervisor',l:lang==='en'?'Supervisor':'مراقب'},{v:'storekeeper',l:lang==='en'?'Storekeeper':'مسؤول مستودع'}];
  const overlay = withModalOverlay(`<h3>${L.addMember}</h3>
    <div class="field"><label>${lang==='en'?'Name':'الاسم'}</label><input id="tmName"></div>
    <div class="field"><label>${L.role}</label><select id="tmRole">${ROLE_OPTS.map(r=>`<option value="${r.v}">${r.l}</option>`).join('')}</select></div>
    <div class="modal-actions"><button class="btn" onclick="this.closest('.modal-overlay').remove()">${lang==='en'?'Cancel':'إلغاء'}</button><button class="btn btn-primary" id="tmSave">${lang==='en'?'Add':'إضافة'}</button></div>`);
  setTimeout(()=>{
    document.getElementById('tmSave')?.addEventListener('click', ()=>{
      const name = document.getElementById('tmName')?.value?.trim();
      if(!name) return;
      const role = document.getElementById('tmRole')?.value||'manager';
      const roleMap = {manager:lang==='en'?'Project Manager':'مدير مشروع', engineer:lang==='en'?'Engineer':'مهندس', supervisor:lang==='en'?'Supervisor':'مراقب', storekeeper:lang==='en'?'Storekeeper':'مسؤول مستودع'};
      const roleArMap = {manager:'مدير مشروع', engineer:'مهندس', supervisor:'مراقب', storekeeper:'مسؤول مستودع'};
      p.team.push({name, role, roleAr: roleArMap[role]||role});
      syncCurrentProject();
      overlay.remove();
      const existing = document.getElementById('projDetailOverlay');
      if(existing) existing.remove();
      openProjectDetail(idx);
    });
  }, 50);
}
function showAddDocModal(idx){
  const p = projects[idx]; if(!p) return;
  const L = STR[lang].projects;
  const overlay = withModalOverlay(`<h3>${L.addDocument}</h3>
    <div class="field"><label>${L.documentName}</label><input id="docName"></div>
    <div class="field"><label>${L.docType}</label><select id="docType"><option value="PDF">PDF</option><option value="DWG">DWG</option><option value="XLSX">XLSX</option></select></div>
    <div class="field"><label>${lang==='en'?'File':'الملف'}</label><input type="file" id="docFile"></div>
    <div class="field"><label>${L.uploadDate}</label><input type="date" id="docDate" value="${new Date().toISOString().split('T')[0]}"></div>
    <div class="modal-actions"><button class="btn" onclick="this.closest('.modal-overlay').remove()">${lang==='en'?'Cancel':'إلغاء'}</button><button class="btn btn-primary" id="docSave">${lang==='en'?'Add':'إضافة'}</button></div>`);
  setTimeout(()=>{
    document.getElementById('docSave')?.addEventListener('click', ()=>{
      const name = document.getElementById('docName')?.value?.trim();
      if(!name) return;
      const fileInput = document.getElementById('docFile');
      const file = fileInput?.files?.[0];
      if(file){
        const reader = new FileReader();
        reader.onload = function(e){
          p.docs.push({name, type:document.getElementById('docType')?.value||'PDF', date:document.getElementById('docDate')?.value||'', url:e.target.result, file:file.name});
          syncCurrentProject();
          overlay.remove();
          const existing = document.getElementById('projDetailOverlay');
          if(existing) existing.remove();
          openProjectDetail(idx);
        };
        reader.readAsDataURL(file);
      } else {
        p.docs.push({name, type:document.getElementById('docType')?.value||'PDF', date:document.getElementById('docDate')?.value||'', url:'', file:''});
        syncCurrentProject();
        overlay.remove();
        const existing = document.getElementById('projDetailOverlay');
        if(existing) existing.remove();
        openProjectDetail(idx);
      }
    });
  }, 50);
}
function showAddImageModal(idx){
  const p = projects[idx]; if(!p) return;
  const L = STR[lang].projects;
  const overlay = withModalOverlay(`<h3>${L.addImage}</h3>
    <div class="field"><label>${lang==='en'?'Description':'الوصف'}</label><input id="imgDesc"></div>
    <div class="field"><label>${lang==='en'?'Category':'الفئة'}</label><select id="imgCat"><option value="before">${L.beforeExec}</option><option value="during">${L.duringExec}</option><option value="after">${L.afterExec}</option></select></div>
    <div class="modal-actions"><button class="btn" onclick="this.closest('.modal-overlay').remove()">${lang==='en'?'Cancel':'إلغاء'}</button><button class="btn btn-primary" id="imgSave">${lang==='en'?'Add':'إضافة'}</button></div>`);
  setTimeout(()=>{
    document.getElementById('imgSave')?.addEventListener('click', ()=>{
      p.images.push({src:'', cat:document.getElementById('imgCat')?.value||'before', date:new Date().toISOString().split('T')[0], desc:document.getElementById('imgDesc')?.value?.trim()||''});
      syncCurrentProject();
      overlay.remove();
      const existing = document.getElementById('projDetailOverlay');
      if(existing) existing.remove();
      openProjectDetail(idx);
    });
  }, 50);
}
function showAddRiskModal(idx){
  const p = projects[idx]; if(!p) return;
  const L = STR[lang].projects;
  const overlay = withModalOverlay(`<h3>${L.addRisk}</h3>
    <div class="field"><label>${lang==='en'?'Description':'الوصف'}</label><textarea id="riskDesc" rows="2"></textarea></div>
    <div class="field"><label>${L.riskLevel}</label><select id="riskLevel"><option value="high">${lang==='en'?'High':'عالية'}</option><option value="medium">${lang==='en'?'Medium':'متوسطة'}</option><option value="low">${lang==='en'?'Low':'منخفضة'}</option></select></div>
    <div class="field"><label>${L.status}</label><select id="riskStatus"><option value="active">${lang==='en'?'Active':'نشط'}</option><option value="resolved">${lang==='en'?'Resolved':'تم الحل'}</option></select></div>
    <div class="modal-actions"><button class="btn" onclick="this.closest('.modal-overlay').remove()">${lang==='en'?'Cancel':'إلغاء'}</button><button class="btn btn-primary" id="riskSave">${lang==='en'?'Add':'إضافة'}</button></div>`);
  setTimeout(()=>{
    document.getElementById('riskSave')?.addEventListener('click', ()=>{
      const desc = document.getElementById('riskDesc')?.value?.trim();
      if(!desc) return;
      p.risks.push({name:desc, nameAr:desc, level:document.getElementById('riskLevel')?.value||'medium', status:document.getElementById('riskStatus')?.value||'active', date:new Date().toISOString().split('T')[0]});
      syncCurrentProject();
      overlay.remove();
      const existing = document.getElementById('projDetailOverlay');
      if(existing) existing.remove();
      openProjectDetail(idx);
    });
  }, 50);
}
function showAddPhaseModal(idx){
  const L = STR[lang].projects;
  const body = document.getElementById('projDetailBody');
  if(!body) return;
  body.innerHTML = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;">
    <h3 style="margin:0 0 16px;font-size:15px;font-weight:800;">${lang==='en'?'Add Phase':'إضافة مرحلة'}</h3>
    <div class="phase-form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <label>${L.phase} (EN)<input id="addPhaseName" style="margin-top:4px;" placeholder="${lang==='en'?'Phase Name':'اسم المرحلة'}"></label>
      <label>${L.phase} (AR)<input id="addPhaseNameAr" style="margin-top:4px;" placeholder="${lang==='ar'?'اسم المرحلة':'Phase Name'}"></label>
      <label>${L.startDatePhase}<input type="date" id="addPhaseStart" style="margin-top:4px;"></label>
      <label>${L.endDatePhase}<input type="date" id="addPhaseEnd" style="margin-top:4px;"></label>
      <label>${L.responsible}<input id="addPhaseResp" style="margin-top:4px;" placeholder="${lang==='en'?'Responsible':'المسؤول'}"></label>
      <label>${L.phaseStatus}<select id="addPhaseStatus" style="margin-top:4px;">${['notStarted','inProgress','completed','delayed'].map(s => `<option value="${s}">${getPhaseStatusLabel(s)}</option>`).join('')}</select></label>
    </div>
    <div style="margin-top:16px;display:flex;gap:8px;">
      <button class="btn-mini" onclick="saveNewPhase(${idx})">${lang==='en'?'Add':'إضافة'}</button>
      <button class="btn-mini" style="background:var(--surface-2);color:var(--text);" onclick="document.getElementById('projDetailBody').innerHTML=renderProjPhasesTab(projects[${idx}],${idx},STR[lang].projects)">${lang==='en'?'Cancel':'إلغاء'}</button>
    </div>
  </div>`;
}
function saveNewPhase(idx){
  const p = projects[idx]; if(!p) return;
  const name = document.getElementById('addPhaseName').value.trim();
  if(!name){ showToast(lang==='en'?'Phase name required':'اسم المرحلة مطلوب','error'); return; }
  p.phases.push({
    id: 'P'+Date.now(),
    name: name,
    nameAr: document.getElementById('addPhaseNameAr').value.trim(),
    start: document.getElementById('addPhaseStart').value,
    end: document.getElementById('addPhaseEnd').value,
    resp: document.getElementById('addPhaseResp').value.trim(),
    status: document.getElementById('addPhaseStatus').value,
    notes: '', notesAr: '', progress: getPhaseProgressFromStatus(document.getElementById('addPhaseStatus').value),
  });
  const body = document.getElementById('projDetailBody');
  if(body) body.innerHTML = renderProjPhasesTab(projects[idx], idx, STR[lang].projects);
  syncCurrentProject();
}
function getPhaseProgressFromStatus(status){
  return status==='completed' ? 100 : status==='inProgress'||status==='delayed' ? 50 : 0;
}
function updatePhaseField(idx, pi, field, value){
  const p = projects[idx]; if(!p) return;
  if(!p.phases[pi]) return;
  p.phases[pi][field] = value;
  if(field === 'status') p.phases[pi].progress = getPhaseProgressFromStatus(value);
  syncCurrentProject();
}
function deletePhase(idx, pi){
  const p = projects[idx]; if(!p) return;
  p.phases.splice(pi, 1);
  const total = p.phases.length;
  const completed = p.phases.filter(ph=>ph.status==='completed').length;
  p.progress = total ? Math.round(completed/total*100) : 0;
  const body = document.getElementById('projDetailBody');
  if(body) body.innerHTML = renderProjPhasesTab(p, idx, STR[lang].projects);
  syncCurrentProject();
}
function savePhases(idx){
  const p = projects[idx]; if(!p) return;
  const total = p.phases.length;
  const completed = p.phases.filter(ph=>ph.status==='completed').length;
  p.progress = total ? Math.round(completed/total*100) : 0;
  const body = document.getElementById('projDetailBody');
  if(body) body.innerHTML = renderProjPhasesTab(p, idx, STR[lang].projects);
  syncCurrentProject();
}
function deleteProjectTeamMember(idx, mi){
  const p = projects[idx]; if(!p) return;
  p.team.splice(mi, 1);
  syncCurrentProject();
  const body = document.getElementById('projDetailBody');
  if(body) body.innerHTML = renderProjTeamTab(p, idx, STR[lang].projects);
}
function deleteProjectDoc(idx, di){
  const p = projects[idx]; if(!p) return;
  p.docs.splice(di, 1);
  syncCurrentProject();
  const body = document.getElementById('projDetailBody');
  if(body) body.innerHTML = renderProjDocsTab(p, idx, STR[lang].projects);
}
function deleteProjectPO(idx, pi){
  const p = projects[idx]; if(!p) return;
  p.poRefs.splice(pi, 1);
  syncCurrentProject();
  const body = document.getElementById('projDetailBody');
  if(body) body.innerHTML = renderProjPurchasesTab(p, idx, STR[lang].projects);
}
function deleteProjectRisk(idx, ri){
  const p = projects[idx]; if(!p) return;
  p.risks.splice(ri, 1);
  syncCurrentProject();
  const body = document.getElementById('projDetailBody');
  if(body) body.innerHTML = renderProjRisksTab(p, idx, STR[lang].projects);
}
function deleteProjectImage(idx, imgIdx){
  const p = projects[idx]; if(!p) return;
  p.images.splice(imgIdx, 1);
  syncCurrentProject();
  const body = document.getElementById('projDetailBody');
  if(body) body.innerHTML = renderProjGalleryTab(p, idx, STR[lang].projects);
}
function showAddPOModal(idx){
  const p = projects[idx]; if(!p) return;
  const overlay = withModalOverlay(`<h3>${lang==='en'?'Add Purchase Order':'إضافة أمر شراء'}</h3>
    <div class="field"><label>${lang==='en'?'PO Number':'رقم أمر الشراء'}</label><input id="poRefNum"></div>
    <div class="field"><label>${lang==='en'?'Supplier':'المورد'}</label><input id="poRefSupplier"></div>
    <div class="field"><label>${lang==='en'?'Value (SAR)':'القيمة'}</label><input type="number" id="poRefValue"></div>
    <div class="field"><label>${lang==='en'?'Order Date':'تاريخ الطلب'}</label><input type="date" id="poRefDate" value="${new Date().toISOString().split('T')[0]}"></div>
    <div class="field"><label>${lang==='en'?'Delivery Date':'تاريخ التسليم'}</label><input type="date" id="poRefDelivery"></div>
    <div class="modal-actions"><button class="btn" onclick="this.closest('.modal-overlay').remove()">${lang==='en'?'Cancel':'إلغاء'}</button><button class="btn btn-primary" id="poRefSave">${lang==='en'?'Add':'إضافة'}</button></div>`);
  setTimeout(()=>{
    document.getElementById('poRefSave')?.addEventListener('click', ()=>{
      const id = document.getElementById('poRefNum')?.value?.trim()||'PO-'+Date.now();
      p.poRefs = p.poRefs||[];
      p.poRefs.push({id, supplier:document.getElementById('poRefSupplier')?.value?.trim()||'', value:parseFloat(document.getElementById('poRefValue')?.value)||0, date:document.getElementById('poRefDate')?.value||'', delivery:document.getElementById('poRefDelivery')?.value||'', status:'pending'});
      syncCurrentProject();
      overlay.remove();
      const existing = document.getElementById('projDetailOverlay');
      if(existing) existing.remove();
      openProjectDetail(idx);
    });
  }, 50);
}
function addProjectMaterial(idx){
  const p = projects[idx]; if(!p) return;
  const name = prompt(lang==='en'?'Material name:':'اسم المادة:');
  if(!name) return;
  const qty = parseInt(prompt(lang==='en'?'Required quantity:':'الكمية المطلوبة:')) || 0;
  p.materials.push({id:'M'+Date.now(), name, nameAr:name, qtyReq:qty, qtyIssued:0, qtyRemaining:qty, status:'notAvailable'});
  syncCurrentProject();
  const existing = document.getElementById('projDetailOverlay');
  if(existing) existing.remove();
  openProjectDetail(idx);
}


const PAGES = ['dashboard','inventory','warehouses','sales','purchasing','issues','movements','reports','projects','users','notifications','settings'];
const RENDERERS = {
  dashboard:renderDashboard, inventory:renderInventory, warehouses:renderWarehouses,
  purchasing:renderPurchasing, issues:renderIssues, movements:renderMovements, projects:renderProjects,
  sales:renderSales, reports:renderReports, users:renderUsers, notifications:renderNotifications, settings:renderSettings,
};
let currentPage = 'dashboard';

function buildNav(){
  const L = STR[lang];
  const navList = document.getElementById('navList');
  const iconKey = {
    dashboard:'dashboard', inventory:'inventory', warehouses:'warehouse',
    sales:'sales', purchasing:'purchase', issues:'issue', movements:'movements',
    reports:'reports', projects:'projects', users:'users', notifications:'notifications', settings:'settings'
  };
  navList.innerHTML = PAGES.map(p=>`
    <button class="nav-item ${p===currentPage?'active':''}" data-page="${p}" data-tooltip="${L.nav[p]||p}">
      ${ICONS[iconKey[p]]||''}<span>${L.nav[p]||p}</span>
      ${p==='notifications'?'<span class="dot"></span>':''}
    </button>`).join('');
  navList.querySelectorAll('.nav-item').forEach(btn=>{
    btn.addEventListener('click', ()=> navigate(btn.dataset.page));
  });
}

function navigate(page){
  currentPage = page;
  const L = STR[lang];
  const contentEl = document.getElementById('content');
  document.getElementById('pageTitle').textContent = L.page[page][0];
  document.getElementById('pageSub').textContent = L.page[page][1];
  contentEl.classList.remove('page-enter');
  void contentEl.offsetWidth;
  contentEl.innerHTML = RENDERERS[page]();
  contentEl.classList.add('page-enter');
  buildNav();
  postRenderHooks(page);
  contentEl.scrollTop = 0;
  if(window.innerWidth <= 900){
    document.getElementById('sidebar')?.classList.remove('open');
    document.querySelector('.app')?.classList.remove('has-sidebar-open');
  }
}


function mountProjectsChart(){
  const ctx = document.getElementById('projChart');
  if(!ctx) return;
  if(ctx.chart) ctx.chart.destroy();
  const isDark = theme === 'dark';
  const labels = projects.map(p => lang==='en'?p.name:p.nameAr);
  const progs = projects.map(p => p.progress);
  const colors = projects.map(p => {
    const e = calcEndDate(p.startDate, p.duration);
    const r = calcDaysRemaining(e);
    if(r < 0) return '#E0282A';
    if(p.progress >= 80) return '#22C55E';
    if(p.progress >= 40) return '#F59E0B';
    return '#0A66FF';
  });
  if(typeof Chart!=='undefined'){
    ctx.chart = new Chart(ctx,{type:'bar',data:{labels, datasets:[{label:STR[lang].projects.progress, data:progs, backgroundColor:colors, borderRadius:6, maxBarThickness:40}]},
      options:{indexAxis:'y', plugins:{legend:{display:false}}, scales:{
        x:{min:0,max:100,grid:{color:isDark?'#2B2E34':'#E4E7EC'},ticks:{color:isDark?'#9A9DA6':'#62666F'}},
        y:{grid:{display:false},ticks:{color:isDark?'#9A9DA6':'#62666F'}}
      }}
    });
  }
}

function postRenderHooks(page){
  if(page==='sales'){
    renderQuoteRows();
    document.getElementById('newQuoteBtn').addEventListener('click', ()=>openQuoteModal(null));
    document.getElementById('quoteSearch').addEventListener('input', e=>{
      const statusF = document.getElementById('quoteFilterStatus').value;
      renderQuoteRows(e.target.value, statusF);
    });
    document.getElementById('quoteFilterBtn').addEventListener('click', ()=>{
      document.getElementById('quoteFilterPanel').classList.toggle('open');
    });
    document.getElementById('quoteFilterApply').addEventListener('click', ()=>{
      const status = document.getElementById('quoteFilterStatus').value;
      const search = document.getElementById('quoteSearch').value;
      renderQuoteRows(search, status);
    });
    document.getElementById('quoteFilterReset').addEventListener('click', ()=>{
      document.getElementById('quoteFilterStatus').value='';
      document.getElementById('quoteSearch').value='';
      renderQuoteRows();
    });
  }
  if(page==='dashboard') mountDashboardCharts();
  if(page==='reports'){
    // report tab switching
    document.querySelectorAll('.report-tab').forEach(tab => {
      tab.addEventListener('click', function(){
        currentReport = this.dataset.rt;
        navigate('reports');
      });
    });
    // date filter apply
    const applyBtn = document.getElementById('repFilterApply');
    if(applyBtn) applyBtn.addEventListener('click', ()=>{
      reportDateFrom = document.getElementById('repFrom').value;
      reportDateTo = document.getElementById('repTo').value;
      navigate('reports');
    });
    const resetBtn = document.getElementById('repFilterReset');
    if(resetBtn) resetBtn.addEventListener('click', ()=>{
      reportDateFrom = '';
      reportDateTo = '';
      navigate('reports');
    });
    // print
    const printBtn = document.getElementById('repPrintBtn');
    if(printBtn) printBtn.addEventListener('click', printReport);
    // export CSV
    const exportBtn = document.getElementById('repExportBtn');
    if(exportBtn) exportBtn.addEventListener('click', ()=> exportReportCSV2(currentReport));
  }
  
  if(page==='projects'){
    document.querySelectorAll('[data-ptab]').forEach(tab => {
      tab.addEventListener('click', function(){ currentProjectTab = this.dataset.ptab; navigate('projects'); });
    });
    const fb = document.getElementById('projFilterBtn');
    if(fb) fb.addEventListener('click', ()=> document.getElementById('projFilterPanel')?.classList.toggle('open'));
    const fa = document.getElementById('projFilterApply');
    if(fa) fa.addEventListener('click', ()=> navigate('projects'));
    const fr = document.getElementById('projFilterReset');
    if(fr) fr.addEventListener('click', ()=>{
      const s=document.getElementById('projSearch'); if(s) s.value='';
      const sf=document.getElementById('projStatusFilter'); if(sf) sf.value='';
      const pf=document.getElementById('projPriorityFilter'); if(pf) pf.value='';
      navigate('projects');
    });
    const ss = document.getElementById('projSearch');
    if(ss){
      let searchTimer;
      ss.addEventListener('input', ()=>{
        clearTimeout(searchTimer);
        searchTimer = setTimeout(()=> navigate('projects'), 300);
      });
    }
    const nb = document.getElementById('newProjBtn');
    if(nb) nb.addEventListener('click', ()=> openProjectModal(null));
    const planGrid = document.getElementById('planGrid');
    if(planGrid){
      planGrid.ondrop = function(e){
        e.preventDefault();
        const from = parseInt(e.dataTransfer.getData('text/plain'));
        const target = e.target.closest('.card');
        if(!target || isNaN(from)) return;
        const cards = [...this.querySelectorAll('.card')];
        const to = cards.indexOf(target);
        if(from===to) return;
        const item = projects.splice(from,1)[0];
        projects.splice(to,0,item);
        navigate('projects');
      };
      planGrid.ondragover = e => e.preventDefault();
    }
    mountProjectsChart();
    // note add now uses onclick="addProjectNote(idx)" in renderProjNotesTab
  }

  if(page==='inventory'){
    renderInvRows();
    bindInvRowActions();
    document.getElementById('invSearch').addEventListener('input', e=>renderInvRows(e.target.value));
    document.getElementById('addItemBtn').addEventListener('click', ()=> openModal());
    // filter toggle
    document.getElementById('invFilterBtn').addEventListener('click', ()=>{
      document.getElementById('invFilterPanel').classList.toggle('open');
    });
    document.getElementById('invFilterApply').addEventListener('click', ()=>{
      const status = document.getElementById('invFilterStatus').value;
      const cat = document.getElementById('invFilterCat').value;
      renderInvRows('', status, cat);
    });
    document.getElementById('invFilterReset').addEventListener('click', ()=>{
      document.getElementById('invFilterStatus').value='';
      document.getElementById('invFilterCat').value='';
      renderInvRows();
    });
    // export CSV
    document.getElementById('invExportBtn').addEventListener('click', ()=> exportCSV(inventoryData, 'inventory'));
  }
  if(page==='purchasing'){
    document.getElementById('newPoBtn').addEventListener('click', ()=>openPOModal(null));
    document.querySelectorAll('[data-action="viewpo"]').forEach(b=>b.addEventListener('click',()=>openPOView(parseInt(b.dataset.idx))));
    document.querySelectorAll('[data-action="editpo"]').forEach(b=>b.addEventListener('click',()=>openPOModal(parseInt(b.dataset.idx))));
    document.querySelectorAll('[data-action="deletepo"]').forEach(b=>b.addEventListener('click',()=>openPODelete(parseInt(b.dataset.idx))));
  }
  if(page==='issues'){
    document.getElementById('newIssueBtn').addEventListener('click', ()=>openIssueModal(null));
    document.querySelectorAll('[data-action="viewreq"]').forEach(b=>b.addEventListener('click',()=>viewIssue(parseInt(b.dataset.idx))));
    document.querySelectorAll('[data-action="editreq"]').forEach(b=>b.addEventListener('click',()=>openIssueModal(parseInt(b.dataset.idx))));
    document.querySelectorAll('[data-action="deletereq"]').forEach(b=>b.addEventListener('click',()=>deleteIssue(parseInt(b.dataset.idx))));
  }
  if(page==='warehouses'){
    document.getElementById('addWhBtn').addEventListener('click', ()=> openWhModal(null));
    document.getElementById('transferWhBtn').addEventListener('click', openTransferModal);
    document.querySelectorAll('.wh-edit-btn').forEach(btn=>{
      btn.addEventListener('click', (e)=>{ e.stopPropagation(); openWhModal(parseInt(btn.dataset.idx)); });
    });
    document.querySelectorAll('.wh-del-btn').forEach(btn=>{
      btn.addEventListener('click', (e)=>{ e.stopPropagation(); openWhDeleteModal(parseInt(btn.dataset.idx)); });
    });
  }
  if(page==='movements'){
    renderMovRows();
    document.getElementById('movFilterBtn').addEventListener('click', ()=>{
      document.getElementById('movFilterPanel').classList.toggle('open');
    });
    document.getElementById('movFilterApply').addEventListener('click', ()=>{
      const type = document.getElementById('movFilterType').value;
      renderMovRows(type);
    });
    document.getElementById('movFilterReset').addEventListener('click', ()=>{
      document.getElementById('movFilterType').value='';
      renderMovRows();
    });
    document.getElementById('movExportBtn').addEventListener('click', ()=> exportCSV(movementsData, 'movements'));
  }
  if(page==='users'){
    renderUsersRows();
    document.getElementById('addUserBtn').addEventListener('click', ()=> openUserModal());
    document.querySelectorAll('[data-action="edituser"]').forEach(b=>b.addEventListener('click',()=>openUserModal(parseInt(b.dataset.idx))));
    document.querySelectorAll('[data-action="deleteuser"]').forEach(b=>b.addEventListener('click',()=>deleteUser(parseInt(b.dataset.idx))));
  }
  document.querySelectorAll('[data-goto]').forEach(b=>b.addEventListener('click', ()=>navigate(b.dataset.goto)));
  if(page==='settings'){
    document.getElementById('darkSwitch').addEventListener('click', toggleTheme);
    document.getElementById('setEn').addEventListener('click', ()=>{ if(lang!=='en'){lang='en';applyLang();} });
    document.getElementById('setAr').addEventListener('click', ()=>{ if(lang!=='ar'){lang='ar';applyLang();} });
    document.getElementById('lowStockSwitch').addEventListener('click', ()=> toggleSetting('lowStock'));
    document.getElementById('expirySwitch').addEventListener('click', ()=> toggleSetting('expiry'));
    document.getElementById('approvalSwitch').addEventListener('click', ()=> toggleSetting('approval'));
    document.getElementById('backupSwitch').addEventListener('click', ()=> toggleSetting('backup'));
    document.getElementById('offlineSwitch').addEventListener('click', ()=> toggleSetting('offline'));
  }
}

/* ===================================================================
   MODAL — Add / Edit
=================================================================== */
let editingIndex = null;
let currentImageData = null;

function setImgPreview(src){
  const preview = document.getElementById('mImgPreview');
  const removeBtn = document.getElementById('mImgRemoveBtn');
  if(src){
    preview.innerHTML = `<img src="${src}" alt="">`;
    removeBtn.style.display = '';
  } else {
    preview.innerHTML = ICONS.box;
    removeBtn.style.display = 'none';
  }
}

function populateWhSelect(){
  const sel = document.getElementById('mLoc');
  sel.innerHTML = `<option value="">${lang==='en'?'— Select warehouse —':'— اختر المستودع —'}</option>`
    + warehouseData.map(w => `<option value="${lang==='en'?w.name:w.nameAr}">${lang==='en'?w.name:w.nameAr}</option>`).join('');
}
function openModal(idx=null){
  const L = STR[lang];
  editingIndex = idx;
  populateWhSelect();
  const titleEl = document.getElementById('modalTitleEl');
  const saveBtn = document.getElementById('modalSave');
  if(idx===null){
    titleEl.textContent = L.modal.addItem;
    saveBtn.textContent = L.modal.save;
    ['mItemName','mSku','mQty','mMin'].forEach(id=>document.getElementById(id).value='');
    document.getElementById('mLoc').selectedIndex = 0;
    document.getElementById('mCategory').selectedIndex = 0;
    document.getElementById('mUnit').selectedIndex = 0;
    currentImageData = null;
    setImgPreview(null);
  } else {
    const item = inventoryData[idx];
    titleEl.textContent = L.modal.editItem;
    saveBtn.textContent = L.modal.saveChanges;
    document.getElementById('mItemName').value = lang==='en' ? item.name : item.nameAr;
    document.getElementById('mSku').value = item.sku;
    document.getElementById('mQty').value = item.stock;
    document.getElementById('mMin').value = item.min;
    document.getElementById('mLoc').value = item.loc;
    const catSel = document.getElementById('mCategory');
    const catVal = lang==='en' ? item.cat : item.catAr;
    let matched = false;
    [...catSel.options].forEach(o=>{ if(o.value===item.cat || o.textContent===catVal){ o.selected = true; matched = true; } });
    if(!matched) catSel.selectedIndex = 0;
    currentImageData = item.image || null;
    setImgPreview(currentImageData);
  }
  document.getElementById('modalOverlay').classList.add('show');
}
document.getElementById('mImgUploadBtn').addEventListener('click', ()=> document.getElementById('mImgFile').click());
document.getElementById('mImgFile').addEventListener('change', e=>{
  const file = e.target.files[0];
  if(!file) return;
  if(!file.type.startsWith('image/')) return;
  const reader = new FileReader();
  reader.onload = ev=>{
    currentImageData = ev.target.result;
    setImgPreview(currentImageData);
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});
document.getElementById('mImgRemoveBtn').addEventListener('click', ()=>{
  currentImageData = null;
  setImgPreview(null);
});
function closeModal(){ document.getElementById('modalOverlay').classList.remove('show'); editingIndex = null; }
document.getElementById('modalCancel').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', e=>{ if(e.target.id==='modalOverlay') closeModal(); });
document.getElementById('modalSave').addEventListener('click', ()=>{
  const name = document.getElementById('mItemName').value.trim();
  const sku = document.getElementById('mSku').value.trim() || ('SKU-'+Math.floor(100000+Math.random()*899999));
  const qty = parseInt(document.getElementById('mQty').value)||0;
  const min = parseInt(document.getElementById('mMin').value)||0;
  const loc = document.getElementById('mLoc').value.trim() || 'WH-A';
  const cat = document.getElementById('mCategory').value;
  if(!name){ document.getElementById('mItemName').focus(); return; }
  if(editingIndex===null){
    inventoryData.unshift({name, nameAr:name, sku, cat, catAr:cat, stock:qty, min, loc, image:currentImageData});
  } else {
    const item = inventoryData[editingIndex];
    if(lang==='en'){ item.name = name; } else { item.nameAr = name; }
    item.cat = cat; item.catAr = cat;
    item.sku = sku; item.stock = qty; item.min = min; item.loc = loc;
    item.image = currentImageData;
  }
  closeModal();
  if(currentPage==='inventory') renderInvRows();
});

/* User Modal */
document.getElementById('userCancel').addEventListener('click', closeUserModal);
document.getElementById('userModalOverlay').addEventListener('click', e=>{ if(e.target.id==='userModalOverlay') closeUserModal(); });
document.getElementById('userSave').addEventListener('click', saveUser);
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && document.getElementById('userModalOverlay').style.display==='flex') closeUserModal(); });

/* ===================================================================
   MODAL — View (read-only)
=================================================================== */
function openViewModal(idx){
  const L = STR[lang];
  const i = inventoryData[idx];
  document.getElementById('viewModalTitle').textContent = L.modal.viewItem;
  const st = statusFor(i);
  document.getElementById('viewModalBody').innerHTML = `
    ${i.image?`<img class="view-img-large" src="${i.image}" alt="">`:''}
    <div class="field"><label>${L.modal.itemName}</label><div style="font-weight:700;font-size:14px;">${lang==='en'?i.name:i.nameAr}</div></div>
    <div class="field-row" style="margin-top:10px;">
      <div class="field"><label>${L.modal.sku}</label><div>${i.sku}</div></div>
      <div class="field"><label>${L.modal.category}</label><div><span class="cat-tag">${lang==='en'?i.cat:i.catAr}</span></div></div>
    </div>
    <div class="field-row">
      <div class="field"><label>${L.modal.qty}</label><div>${i.stock}</div></div>
      <div class="field"><label>${L.modal.minLevel}</label><div>${i.min}</div></div>
    </div>
    <div class="field"><label>${L.modal.location}</label><div>${i.loc}</div></div>
    <div class="field"><label>${L.table.status}</label><div><span class="pill ${st.cls}">${st.label}</span></div></div>
  `;
  document.getElementById('viewModalOverlay').classList.add('show');
}
function closeViewModal(){ document.getElementById('viewModalOverlay').classList.remove('show'); }
document.getElementById('viewModalClose').addEventListener('click', closeViewModal);
document.getElementById('viewModalOverlay').addEventListener('click', e=>{ if(e.target.id==='viewModalOverlay') closeViewModal(); });

/* ===================================================================
   MODAL — Delete confirmation
=================================================================== */
let deletingIndex = null;
function openDeleteModal(idx){
  const L = STR[lang];
  deletingIndex = idx;
  const item = inventoryData[idx];
  document.getElementById('deleteModalTitle').textContent = L.modal.deleteTitle;
  document.getElementById('deleteModalBody').textContent = L.modal.deleteBody.replace('{name}', lang==='en'?item.name:item.nameAr);
  document.getElementById('deleteModalOverlay').classList.add('show');
}
function closeDeleteModal(){ document.getElementById('deleteModalOverlay').classList.remove('show'); deletingIndex = null; }
document.getElementById('deleteCancel').addEventListener('click', closeDeleteModal);
document.getElementById('deleteModalOverlay').addEventListener('click', e=>{ if(e.target.id==='deleteModalOverlay') closeDeleteModal(); });
document.getElementById('deleteConfirm').addEventListener('click', ()=>{
  if(deletingIndex!==null){
    inventoryData.splice(deletingIndex, 1);
    if(currentPage==='inventory') renderInvRows();
  }
  closeDeleteModal();
});

/* ===================================================================
   TOAST
=================================================================== */
function showToast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 2800);
}

/* ===================================================================
   CONFIRM DIALOG
=================================================================== */
function showConfirm(msg){
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.style.cssText = 'z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div class="modal" style="max-width:380px;width:90%;padding:30px 24px 20px;text-align:center;border-radius:var(--radius-lg);box-shadow:0 16px 48px rgba(0,0,0,0.25);">
        <div style="width:56px;height:56px;border-radius:50%;background:var(--red-soft);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:26px;height:26px;"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </div>
        <div style="font-size:17px;font-weight:800;margin-bottom:8px;color:var(--text);">${lang==='en'?'Confirm':'تأكيد'}</div>
        <div style="font-size:13px;color:var(--text-2);margin-bottom:28px;line-height:1.6;padding:0 8px;">${msg}</div>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button class="btn" id="confirmCancelBtn" style="min-width:110px;padding:10px 20px;border-radius:var(--radius-sm);font-weight:700;font-size:13px;background:var(--surface-2);color:var(--text);border:none;">${lang==='en'?'Cancel':'إلغاء'}</button>
          <button class="btn btn-primary" id="confirmOkBtn" style="min-width:110px;padding:10px 20px;border-radius:var(--radius-sm);background:var(--blue);color:#fff;font-weight:700;font-size:13px;border:none;">${lang==='en'?'Delete':'حذف'}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#confirmCancelBtn').onclick = () => { overlay.remove(); resolve(false); };
    overlay.querySelector('#confirmOkBtn').onclick = () => { overlay.remove(); resolve(true); };
    overlay.onclick = e => { if(e.target === overlay) { overlay.remove(); resolve(false); } };
  });
}

/* ===================================================================
   EXPORT CSV
=================================================================== */
function exportCSV(data, name){
  let headers, rows;
  if(name==='inventory'){
    headers=['Name','SKU','Category','Stock','Min Level','Location','Status'];
    rows=data.map(i=>[lang==='en'?i.name:i.nameAr, i.sku, lang==='en'?i.cat:i.catAr, i.stock, i.min, i.loc, statusFor(i).label]);
  } else {
    headers=['Ref','Type','Item','Qty','Warehouse','Time'];
    rows=data.map(m=>[m.ref, m.type, lang==='en'?m.item:m.itemAr, m.qty, m.wh, m.time]);
  }
  const csv=[headers,...rows].map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a=document.createElement('a');
  a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv);
  a.download=name+'_export.csv'; a.click();
  showToast(lang==='en'?'Export downloaded!':'تم تصدير الملف بنجاح!');
}

function exportReportCSV2(type){
  const L = STR[lang].reports;
  const nameMap = {slow:L.slow, fast:L.fast, purchases:L.purchases, disbursement:L.disbursement, suppliers:L.suppliers, inventory:L.inventory};
  let headers, rows;
  const {from, to} = getReportDateRange();
  switch(type){
    case 'slow': {
      const data = getSlowMovingData(from, to);
      headers = [L.colItem, L.colSku, L.colStock, L.colMin, L.colLocation, L.colMovements, L.colMovement];
      rows = data.map(i => [lang==='en'?i.name:i.nameAr, i.sku, i.stock, i.min, i.loc, i.movCount, i.lastMovement]);
      break;
    }
    case 'fast': {
      const data = getFastMovingData(from, to);
      headers = [L.colItem, L.colSku, L.colStock, L.colMovements, L.colMovement];
      rows = data.map(i => [lang==='en'?i.name:i.nameAr, i.sku, i.stock, i.count, i.last]);
      break;
    }
    case 'purchases': {
      const data = getPurchasesData(from, to);
      headers = ['PO#', L.colSupplier, L.colDate, lang==='en'?'Items':'البنود', L.colTotal, L.colStatus];
      rows = data.map(d => [d.id, d.supplier, d.date, d.items, d.total.toFixed(2), d.status]);
      break;
    }
    case 'disbursement': {
      const data = getDisbursementData(from, to);
      headers = [L.colDepartment, L.colItem, L.colQty, L.colDate, L.colPriority, L.colStatus];
      rows = data.map(d => [d.department, d.item, d.qty, d.date, d.priority, d.status]);
      break;
    }
    case 'suppliers': {
      const data = getSuppliersData(from, to);
      headers = [L.colSupplier, L.colDelivery, L.colQuality, L.colOrders, L.colSpend, L.colStatus];
      rows = data.map(d => [d.name, d.delivery, d.quality+'%', d.orders, d.totalSpend.toFixed(2), d.status]);
      break;
    }
    case 'inventory': {
      const data = getInventoryData(from, to);
      headers = [L.colItem, L.colSku, L.colStock, L.colMin, L.colLocation, L.colValue, L.colStatus];
      const invStatMap = {in:lang==='en'?'In Stock':'متوفر', low:lang==='en'?'Low':'منخفض', critical:lang==='en'?'Critical':'حرج'};
      rows = data.map(d => [d.name, d.sku, d.stock, d.min, d.location, 'SAR '+(d.stock * (d.sku==='SKU-880012'?2500 : d.sku==='SKU-654001'?3200 : d.sku==='SKU-123456'?450 : d.sku==='SKU-230911'?180 : d.sku==='SKU-S4109'?920 : d.sku==='SKU-M2033'?1800 : d.sku==='SKU-R1102'?650 : 350)).toLocaleString('en',{minimumFractionDigits:0}), invStatMap[d.status]||d.status]);
      break;
    }
    default: return;
  }
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
  a.download = (nameMap[type]||type)+'_report.csv';
  a.click();
  showToast(lang==='en'?'Report exported!':'تم تصدير التقرير!');
}

/* ===================================================================
   PURCHASE ORDER MODAL
=================================================================== */
/* ===================================================================
   ENHANCED PURCHASE ORDER MODAL
=================================================================== */
let poLines = [];
let editingPoIndex = null;

const PO_SUPPLIERS_EN = ['Al-Bina Steel Co.','Gulf Hydraulics Ltd.','Falcon Automation','Eastern Polymers'];

function poLineRow(line, i){
  const L = STR[lang];
  const isCustom = line.custom === true;
  return `<tr id="poLine_${i}">
    <td>
      <button class="po-toggle-type ${isCustom?'custom':''}" onclick="togglePoLineType(${i})">${isCustom?(lang==='en'?'Custom':'مخصص'):(lang==='en'?'Inventory':'مخزون')}</button>
      ${isCustom
        ? `<input class="po-item-input" style="margin-top:5px;" placeholder="${lang==='en'?'Item description...':'وصف الصنف...'}" value="${line.name||''}" oninput="poLines[${i}].name=this.value;updatePOTotals()">`
        : `<select class="po-item-input" style="margin-top:5px;" onchange="poLines[${i}].name=this.options[this.selectedIndex].text;poLines[${i}].sku=this.value;updatePOTotals()">
            ${inventoryData.map(item=>`<option value="${item.sku}" ${item.sku===line.sku?'selected':''}>${lang==='en'?item.name:item.nameAr}</option>`).join('')}
          </select>`
      }
    </td>
    <td><input class="po-item-input narrow" type="number" min="1" value="${line.qty||1}" oninput="poLines[${i}].qty=+this.value;updatePOTotals()"></td>
    <td><input class="po-item-input" style="max-width:70px;" value="${line.unit||'pcs'}" oninput="poLines[${i}].unit=this.value"></td>
    <td><input class="po-item-input narrow" type="number" min="0" step="0.01" value="${line.price||''}" oninput="poLines[${i}].price=+this.value;updatePOTotals()" placeholder="0.00"></td>
    <td id="poLineTotal_${i}" style="font-weight:700;color:var(--blue);">SAR ${((line.qty||0)*(line.price||0)).toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
    <td><button class="po-del-row" onclick="removePoLine(${i})">${ICONS.trash}</button></td>
  </tr>`;
}

function renderPoLines(){
  document.getElementById('poLinesBody').innerHTML = poLines.map((l,i)=>poLineRow(l,i)).join('');
}

function togglePoLineType(i){
  poLines[i].custom = !poLines[i].custom;
  if(!poLines[i].custom && inventoryData[0]){
    poLines[i].name = inventoryData[0].name;
    poLines[i].sku  = inventoryData[0].sku;
  } else {
    poLines[i].name = ''; poLines[i].sku = '';
  }
  renderPoLines(); updatePOTotals();
}

function removePoLine(i){
  poLines.splice(i,1);
  renderPoLines(); updatePOTotals();
}

function addPoLine(){
  const firstItem = inventoryData[0];
  poLines.push({ name: firstItem?firstItem.name:'', sku: firstItem?firstItem.sku:'', qty:1, unit:'pcs', price:0, custom:false });
  renderPoLines(); updatePOTotals();
}

function updatePOTotals(){
  const subtotal = poLines.reduce((s,l)=>s+(l.qty||0)*(l.price||0), 0);
  const vat = subtotal * 0.15;
  const grand = subtotal + vat;
  document.getElementById('poSubtotal').textContent  = 'SAR '+subtotal.toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2});
  document.getElementById('poVat').textContent       = 'SAR '+vat.toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2});
  document.getElementById('poGrandTotal').textContent= 'SAR '+grand.toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2});
  poLines.forEach((l,i)=>{
    const el = document.getElementById('poLineTotal_'+i);
    if(el) el.textContent = 'SAR '+((l.qty||0)*(l.price||0)).toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2});
  });
}

function openPOModal(editIdx=null){
  const L = STR[lang];
  editingPoIndex = editIdx;
  const isEdit = editIdx!==null && editIdx!==undefined && editIdx>=0;
  document.getElementById('poModalTitle').textContent = isEdit?(lang==='en'?'Edit Purchase Order':'تعديل طلب الشراء'):(lang==='en'?'New Purchase Order':'طلب شراء جديد');
  document.getElementById('poModalBadge').textContent = isEdit?purchaseOrders[editIdx].id:'';
  // Labels
  document.getElementById('poLblSupplier').textContent = lang==='en'?'Supplier':'المورد';
  document.getElementById('poLblDate').textContent     = lang==='en'?'Expected Delivery Date':'تاريخ التسليم المتوقع';
  document.getElementById('poLblItems').textContent    = lang==='en'?'Items':'الأصناف';
  document.getElementById('poLblNotes').textContent    = lang==='en'?'Notes':'ملاحظات';
  document.getElementById('poLblSubtotal').textContent = lang==='en'?'Subtotal':'المجموع الفرعي';
  document.getElementById('poLblVat').textContent      = lang==='en'?'VAT (15%)':'ضريبة القيمة المضافة (15%)';
  document.getElementById('poLblTotal').textContent    = lang==='en'?'Grand Total':'الإجمالي';
  document.getElementById('poSave').textContent        = lang==='en'?'Submit Order':'إرسال الطلب';
  document.getElementById('poCancel').textContent      = L.modal.cancel;
  document.getElementById('poAddLineBtn').textContent  = lang==='en'?'+ Add Item':'+ إضافة صنف';
  document.getElementById('poThItem').textContent      = lang==='en'?'Item / Description':'الصنف / الوصف';
  document.getElementById('poThQty').textContent       = lang==='en'?'Qty':'الكمية';
  document.getElementById('poThUnit').textContent      = lang==='en'?'Unit':'الوحدة';
  document.getElementById('poThPrice').textContent     = lang==='en'?'Unit Price':'السعر';
  document.getElementById('poThTotal').textContent     = lang==='en'?'Total':'الإجمالي';
  // Fill fields
  const d = new Date(); d.setDate(d.getDate()+14);
  if(isEdit){
    const po = purchaseOrders[editIdx];
    document.getElementById('poSupplier').value = PO_SUPPLIERS_EN.includes(po.supplier)?po.supplier:'__custom__';
    if(!PO_SUPPLIERS_EN.includes(po.supplier)){
      document.getElementById('poCustomSupplierWrap').style.display='';
      document.getElementById('poCustomSupplier').value=po.supplier;
    } else {
      document.getElementById('poCustomSupplierWrap').style.display='none';
    }
    document.getElementById('poDate').value = po.deliveryDate||d.toISOString().split('T')[0];
    document.getElementById('poNotes').value = po.notes||'';
    poLines = (po.items||[]).map(it=>({...it, custom:!it.sku}));
  } else {
    document.getElementById('poSupplier').value='Al-Bina Steel Co.';
    document.getElementById('poCustomSupplierWrap').style.display='none';
    document.getElementById('poCustomSupplier').value='';
    document.getElementById('poDate').value=d.toISOString().split('T')[0];
    document.getElementById('poNotes').value='';
    poLines = [];
    if(inventoryData[0]) addPoLine();
  }
  renderPoLines(); updatePOTotals();
  document.getElementById('poModalOverlay').classList.add('show');
}

function closePOModal(){ document.getElementById('poModalOverlay').classList.remove('show'); editingPoIndex=null; }
document.getElementById('poCancel').addEventListener('click', closePOModal);
document.getElementById('poModalOverlay').addEventListener('click', e=>{ if(e.target.id==='poModalOverlay') closePOModal(); });
document.getElementById('poAddLineBtn').addEventListener('click', addPoLine);

// Custom supplier toggle
document.getElementById('poSupplier').addEventListener('change', function(){
  const isCustom = this.value==='__custom__';
  document.getElementById('poCustomSupplierWrap').style.display = isCustom?'':'none';
});

document.getElementById('poSave').addEventListener('click', ()=>{
  const L = STR[lang];
  let supplier = document.getElementById('poSupplier').value;
  if(supplier==='__custom__') supplier = document.getElementById('poCustomSupplier').value.trim();
  if(!supplier){ showToast(lang==='en'?'Please select a supplier':'يرجى اختيار المورد'); return; }
  if(!poLines.length){ showToast(lang==='en'?'Add at least one item':'أضف صنفاً واحداً على الأقل'); return; }
  const subtotal = poLines.reduce((s,l)=>s+(l.qty||0)*(l.price||0),0);
  const vat = subtotal*0.15;
  const po = {
    id: editingPoIndex!==null&&editingPoIndex>=0 ? purchaseOrders[editingPoIndex].id : nextPOId(),
    supplier,
    date: new Date().toISOString().split('T')[0],
    deliveryDate: document.getElementById('poDate').value,
    items: poLines.map(l=>({name:l.name,sku:l.sku||'',qty:l.qty||1,unit:l.unit||'pcs',price:l.price||0,total:(l.qty||0)*(l.price||0)})),
    notes: document.getElementById('poNotes').value.trim(),
    status: editingPoIndex!==null&&editingPoIndex>=0 ? purchaseOrders[editingPoIndex].status : 'pending',
    subtotal, vat, grandTotal: subtotal+vat
  };
  if(editingPoIndex!==null&&editingPoIndex>=0){ purchaseOrders[editingPoIndex]=po; }
  else { purchaseOrders.unshift(po); }
  closePOModal();
  showToast(lang==='en'?'Purchase order saved!':'تم حفظ طلب الشراء!');
  if(typeof saveAllData==='function') saveAllData();
  navigate('purchasing');
});

/* ── View PO Document ── */
function buildPODocHTML(po){
  const logoB64 = document.querySelector('.brand-logo')?.src || '';
  const isAr = lang==='ar';
  const dir  = isAr?'rtl':'ltr';
  const stCfg = poStatusCfg(po.status);
  const stColors = {approved:'#1FAE5C',pending:'#E2A335',received:'#0A66FF',cancelled:'#E0282A'};
  const stCol = stColors[po.status]||'#666';
  let rowNum = 1;
  const items = (po.items||[]).map(it=>`
    <tr>
      <td style="padding:12px 14px;">
        <div style="font-weight:700;font-size:13px;">${it.name||'—'}</div>
        ${it.sku?`<div style="font-size:10.5px;color:#888;margin-top:2px;">${it.sku}</div>`:''}
      </td>
      <td style="text-align:center;padding:12px 8px;font-weight:600;">${it.qty}</td>
      <td style="text-align:center;padding:12px 8px;color:#666;">${it.unit||'pcs'}</td>
      <td style="text-align:end;padding:12px 14px;">SAR ${(it.price||0).toLocaleString('en',{minimumFractionDigits:2})}</td>
      <td style="text-align:end;padding:12px 14px;font-weight:800;color:#0A66FF;">SAR ${((it.qty||0)*(it.price||0)).toLocaleString('en',{minimumFractionDigits:2})}</td>
    </tr>`).join('');

  return `<div style="font-family:'Inter','Tajawal',sans-serif;color:#15171B;direction:${dir};">

  <!-- HEADER BAND -->
  <div style="background:linear-gradient(135deg,#0A47CC 0%,#0A66FF 55%,#3D8BFF 100%);border-radius:18px;padding:30px 32px;color:#fff;display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;position:relative;overflow:hidden;">
    <div style="position:absolute;inset-inline-end:-40px;top:-40px;width:200px;height:200px;border-radius:50%;background:rgba(255,255,255,.07);"></div>
    <div style="position:absolute;inset-inline-end:60px;bottom:-60px;width:150px;height:150px;border-radius:50%;background:rgba(255,255,255,.05);"></div>
    <div style="display:flex;align-items:center;gap:14px;position:relative;z-index:1;">
      <img src="${logoB64}" alt="StockFlow" style="width:54px;height:54px;border-radius:14px;object-fit:cover;background:#fff;box-shadow:0 4px 16px rgba(0,0,0,.2);">
      <div>
        <div style="font-size:22px;font-weight:800;letter-spacing:-.3px;line-height:1;">StockFlow</div>
        <div style="font-size:11px;opacity:.75;margin-top:3px;">${isAr?'إدارة المستودعات والمخزون الذكية':'Smart Warehouse & Inventory Management'}</div>
      </div>
    </div>
    <div style="text-align:end;position:relative;z-index:1;">
      <div style="font-size:11px;opacity:.7;margin-bottom:4px;text-transform:uppercase;letter-spacing:.08em;">${isAr?'طلب شراء':'Purchase Order'}</div>
      <div style="font-size:30px;font-weight:800;letter-spacing:-1px;line-height:1;">${po.id}</div>
      <div style="display:inline-block;margin-top:8px;padding:4px 14px;border-radius:999px;font-size:11.5px;font-weight:700;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);">
        ${isAr?stCfg.ar:stCfg.en}
      </div>
    </div>
  </div>

  <!-- META ROW -->
  <div class="po-doc-meta-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin-bottom:24px;">
    <div style="background:#F4F6F9;border-radius:12px;padding:16px 18px;">
      <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#888;font-weight:700;margin-bottom:6px;">${isAr?'المورد':'Supplier'}</div>
      <div style="font-size:15px;font-weight:800;color:#0A66FF;">${po.supplier}</div>
      <div style="font-size:11px;color:#888;margin-top:2px;">${isAr?'شركة توريد':'Supply Company'}</div>
    </div>
    <div style="background:#F4F6F9;border-radius:12px;padding:16px 18px;">
      <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#888;font-weight:700;margin-bottom:6px;">${isAr?'تاريخ الطلب':'Order Date'}</div>
      <div style="font-size:15px;font-weight:800;">${po.date||'—'}</div>
      <div style="font-size:11px;color:#888;margin-top:2px;">${isAr?'تاريخ الإصدار':'Issue Date'}</div>
    </div>
    <div style="background:#F4F6F9;border-radius:12px;padding:16px 18px;">
      <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#888;font-weight:700;margin-bottom:6px;">${isAr?'تاريخ التسليم المتوقع':'Expected Delivery'}</div>
      <div style="font-size:15px;font-weight:800;color:#E2A335;">${po.deliveryDate||'—'}</div>
      <div style="font-size:11px;color:#888;margin-top:2px;">${isAr?'الموعد المحدد':'Scheduled Date'}</div>
    </div>
  </div>

  <!-- ITEMS TABLE -->
  <div style="border-radius:14px;overflow:hidden;border:1px solid #E4E7EC;margin-bottom:22px;">
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#0A66FF;color:#fff;">
          <th style="padding:12px 14px;text-align:start;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;font-weight:700;">${isAr?'الصنف / الوصف':'Item / Description'}</th>
          <th style="padding:12px 8px;text-align:center;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;font-weight:700;">${isAr?'الكمية':'Qty'}</th>
          <th style="padding:12px 8px;text-align:center;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;font-weight:700;">${isAr?'الوحدة':'Unit'}</th>
          <th style="padding:12px 14px;text-align:end;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;font-weight:700;">${isAr?'سعر الوحدة':'Unit Price'}</th>
          <th style="padding:12px 14px;text-align:end;font-size:10.5px;text-transform:uppercase;letter-spacing:.07em;font-weight:700;">${isAr?'الإجمالي':'Total'}</th>
        </tr>
      </thead>
      <tbody>${items}</tbody>
    </table>
  </div>

  <!-- TOTALS + NOTES side by side -->
  <div class="po-doc-totals-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px;">
    ${po.notes?`
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:12px;padding:16px 18px;">
      <div style="font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;color:#92400E;font-weight:700;margin-bottom:6px;">${isAr?'ملاحظات':'Notes'}</div>
      <div style="font-size:13px;color:#78350F;">${po.notes}</div>
    </div>`
    :`<div></div>`}
    <div style="background:#F8FAFF;border:1px solid #DBEAFE;border-radius:12px;padding:16px 18px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:9px;font-size:13px;">
        <span style="color:#64748B;">${isAr?'المجموع الفرعي':'Subtotal'}</span>
        <span style="font-weight:600;">SAR ${(po.subtotal||0).toLocaleString('en',{minimumFractionDigits:2})}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:13px;">
        <span style="color:#64748B;">${isAr?'ضريبة القيمة المضافة (15%)':'VAT (15%)'}</span>
        <span style="font-weight:600;">SAR ${(po.vat||0).toLocaleString('en',{minimumFractionDigits:2})}</span>
      </div>
      <div style="border-top:2px solid #DBEAFE;padding-top:12px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:13px;font-weight:700;color:#0A47CC;">${isAr?'الإجمالي الكلي':'Grand Total'}</span>
        <span style="font-size:20px;font-weight:800;color:#0A66FF;">SAR ${(po.grandTotal||0).toLocaleString('en',{minimumFractionDigits:2})}</span>
      </div>
    </div>
  </div>

  <!-- SIGNATURES -->
  <div class="po-doc-sig-grid" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px;">
    ${[isAr?'أعده':'Prepared By', isAr?'اعتمده':'Approved By', isAr?'استلمه':'Received By'].map(lbl=>`
    <div style="border:1px dashed #CBD5E1;border-radius:12px;padding:18px 16px;text-align:center;">
      <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:.05em;margin-bottom:36px;">${lbl}</div>
      <div style="border-top:1.5px solid #CBD5E1;padding-top:8px;font-size:10.5px;color:#94A3B8;">${isAr?'التوقيع':'Signature'}</div>
    </div>`).join('')}
  </div>

  <!-- FOOTER -->
  <div style="text-align:center;padding:14px;background:#F4F6F9;border-radius:10px;font-size:11px;color:#94A3B8;">
    StockFlow — Smart Warehouse & Inventory Management &nbsp;·&nbsp; 
    ${isAr?'تم الإنشاء':'Generated'}: ${new Date().toLocaleDateString(isAr?'ar-SA':'en-GB')}
    &nbsp;·&nbsp; ${po.id}
  </div>

  </div>`;
}

let poDocIdx = -1;
function openPOView(idx){
  poDocIdx = idx;
  const po = purchaseOrders[idx];
  document.getElementById('poDocContent').innerHTML = buildPODocHTML(po);
  document.getElementById('poViewClose').textContent  = lang==='en'?'✕ Close':'✕ إغلاق';
  document.getElementById('poPrintBtn').textContent   = lang==='en'?'🖨 Print':'🖨 طباعة';
  document.getElementById('poSavePdfBtn').textContent = lang==='en'?'⬇ Save PDF':'⬇ حفظ PDF';
  document.getElementById('poViewModalOverlay').classList.add('show');
}
function closePOView(){ document.getElementById('poViewModalOverlay').classList.remove('show'); }
document.getElementById('poViewClose').addEventListener('click', closePOView);
document.getElementById('poViewModalOverlay').addEventListener('click', e=>{ if(e.target.id==='poViewModalOverlay') closePOView(); });
document.getElementById('poPrintBtn').addEventListener('click', ()=>{
  const po = purchaseOrders[poDocIdx];
  if(po) openPrintWindow(buildPODocHTML(po));
});
document.getElementById('poSavePdfBtn').addEventListener('click', ()=>{
  const po = purchaseOrders[poDocIdx];
  if(po) openPrintWindow(buildPODocHTML(po));
});

/* ── Delete PO ── */
let deletingPoIndex = null;
function openPODelete(idx){
  deletingPoIndex = idx;
  const po = purchaseOrders[idx];
  document.getElementById('poDeleteTitle').textContent = lang==='en'?'Delete Purchase Order?':'حذف طلب الشراء؟';
  document.getElementById('poDeleteBody').textContent  = (lang==='en'?`This will permanently delete ${po.id} (${po.supplier}).`:`سيتم حذف ${po.id} (${po.supplier}) نهائياً.`);
  document.getElementById('poDeleteCancel').textContent  = lang==='en'?'Cancel':'إلغاء';
  document.getElementById('poDeleteConfirm').textContent = lang==='en'?'Delete':'حذف';
  document.getElementById('poDeleteModalOverlay').classList.add('show');
}
function closePODelete(){ document.getElementById('poDeleteModalOverlay').classList.remove('show'); deletingPoIndex=null; }
document.getElementById('poDeleteCancel').addEventListener('click', closePODelete);
document.getElementById('poDeleteModalOverlay').addEventListener('click', e=>{ if(e.target.id==='poDeleteModalOverlay') closePODelete(); });
document.getElementById('poDeleteConfirm').addEventListener('click', ()=>{
  if(deletingPoIndex===null) return;
  purchaseOrders.splice(deletingPoIndex,1);
  closePODelete();
  showToast(lang==='en'?'Purchase order deleted.':'تم حذف طلب الشراء.');
  if(typeof saveAllData==='function') saveAllData();
  navigate('purchasing');
});

/* ===================================================================
   ISSUE VIEW (PRINTABLE)
=================================================================== */
function buildReqDocHTML(r){
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const al = isAr ? 'right' : 'left';
  const st = r.status==='approved' ? {cls:'pill-ok', lbl:isAr?'تمت الموافقة':'Approved'} : {cls:'pill-low', lbl:isAr?'قيد الانتظار':'Pending'};
  const itemsHtml = `<tr>
    <td style="padding:10px;border:1px solid #ddd;text-align:center;font-weight:700;">1</td>
    <td style="padding:10px;border:1px solid #ddd;">${isAr?r.itemAr:r.item}</td>
    <td style="padding:10px;border:1px solid #ddd;text-align:center;">${r.qty}</td>
    <td style="padding:10px;border:1px solid #ddd;">${isAr?r.deptAr:r.dept}</td>
  </tr>`;
  return `<div style="padding:30px 35px;font-family:'Tajawal','Inter',sans-serif;color:#1a1a1a;direction:${dir};text-align:${al};">
    <div style="border-bottom:3px solid #1a237e;padding-bottom:15px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-size:22px;font-weight:900;color:#1a237e;">${isAr?'طلب صرف مواد':'Material Requisition'}</div>
        <div style="font-size:13px;color:#666;margin-top:4px;">${isAr?'رقم الطلب':'Req #'}: <b>${r.id}</b></div>
      </div>
      <div style="text-align:center;">
        <span style="font-size:14px;padding:6px 18px;display:inline-block;border-radius:20px;background:${r.status==='approved'?'#1FAE5C':'#E2A335'};color:#fff;">${st.lbl}</span>
      </div>
    </div>
    <div class="po-doc-meta-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
      <div style="background:#f8f9fa;padding:12px;border-radius:8px;border-left:4px solid #1a237e;">
        <div style="font-size:11px;color:#888;margin-bottom:4px;">${isAr?'القسم':'Department'}</div>
        <div style="font-weight:700;">${isAr?r.deptAr:r.dept}</div>
      </div>
      <div style="background:#f8f9fa;padding:12px;border-radius:8px;border-left:4px solid #1a237e;">
        <div style="font-size:11px;color:#888;margin-bottom:4px;">${isAr?'تاريخ الطلب':'Date'}</div>
        <div style="font-weight:700;">${r.date}</div>
      </div>
      <div style="background:#f8f9fa;padding:12px;border-radius:8px;border-left:4px solid #1a237e;">
        <div style="font-size:11px;color:#888;margin-bottom:4px;">${isAr?'الأولوية':'Priority'}</div>
        <div style="font-weight:700;color:${r.priority==='urgent'?'#E2A335':r.priority==='critical'?'#E0282A':'#1a1a1a'};">${r.priority==='urgent'?(isAr?'عاجل':'Urgent'):r.priority==='critical'?(isAr?'حرج':'Critical'):(isAr?'عادي':'Normal')}</div>
      </div>
      <div style="background:#f8f9fa;padding:12px;border-radius:8px;border-left:4px solid #1a237e;">
        <div style="font-size:11px;color:#888;margin-bottom:4px;">${isAr?'السبب':'Reason'}</div>
        <div style="font-weight:700;">${r.reason || (isAr?'—':'—')}</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
      <thead>
        <tr style="background:#1a237e;color:#fff;">
          <th style="padding:10px;border:1px solid #1a237e;width:40px;">#</th>
          <th style="padding:10px;border:1px solid #1a237e;">${isAr?'الصنف':'Item'}</th>
          <th style="padding:10px;border:1px solid #1a237e;width:80px;">${isAr?'الكمية':'Qty'}</th>
          <th style="padding:10px;border:1px solid #1a237e;">${isAr?'القسم':'Department'}</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div style="margin-top:30px;padding-top:15px;border-top:1px solid #ddd;display:flex;justify-content:space-around;text-align:center;font-size:12px;color:#888;">
      <div><div style="border-top:1.5px solid #333;width:140px;padding-top:6px;">${isAr?'التوقيع':'Signature'}</div></div>
      <div><div style="border-top:1.5px solid #333;width:140px;padding-top:6px;">${isAr?'الموافقة':'Approval'}</div></div>
      <div><div style="border-top:1.5px solid #333;width:140px;padding-top:6px;">${isAr?'الاستلام':'Received'}</div></div>
    </div>
  </div>`;
}
function viewIssue(idx){
  const r = reqsData[idx];
  if(!r) return;
  const isAr = lang === 'ar';
  const dir = isAr ? 'rtl' : 'ltr';
  const al = isAr ? 'right' : 'left';
  const st = r.status==='approved' ? {cls:'pill-ok', lbl:isAr?'تمت الموافقة':'Approved'} : {cls:'pill-low', lbl:isAr?'قيد الانتظار':'Pending'};
  const itemsHtml = `<tr>
    <td style="padding:10px;border:1px solid #ddd;text-align:center;font-weight:700;">1</td>
    <td style="padding:10px;border:1px solid #ddd;">${isAr?r.itemAr:r.item}</td>
    <td style="padding:10px;border:1px solid #ddd;text-align:center;">${r.qty}</td>
    <td style="padding:10px;border:1px solid #ddd;">${isAr?r.deptAr:r.dept}</td>
  </tr>`;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.id = 'issueViewOverlay';
  overlay.style.cssText = 'z-index:9999;background:rgba(0,0,0,0.85);display:flex;align-items:flex-start;justify-content:center;overflow:auto;';
  overlay.innerHTML = `
    <div style="background:#fff;width:95%;max-width:210mm;margin:20px auto;padding:0;border-radius:0;box-shadow:0 0 50px rgba(0,0,0,0.5);position:relative;">
      <div style="position:sticky;top:0;z-index:100;display:flex;gap:10px;padding:12px 20px;background:#f8f9fa;border-bottom:1px solid #ddd;justify-content:flex-end;">
        <button class="btn" onclick="this.closest('.modal-overlay').remove()" style="background:#fff;">✕ ${isAr?'إغلاق':'Close'}</button>
        <button class="btn btn-primary" onclick="openPrintWindow(buildReqDocHTML(reqsData[${idx}]))">🖨 ${isAr?'طباعة / PDF':'Print / PDF'}</button>
      </div>
      <div style="padding:30px 35px;font-family:'Tajawal','Inter',sans-serif;color:#1a1a1a;direction:${dir};text-align:${al};">
        <div style="border-bottom:3px solid #1a237e;padding-bottom:15px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:22px;font-weight:900;color:#1a237e;">${isAr?'طلب صرف مواد':'Material Requisition'}</div>
            <div style="font-size:13px;color:#666;margin-top:4px;">${isAr?'رقم الطلب':'Req #'}: <b>${r.id}</b></div>
          </div>
          <div style="text-align:center;">
            <span class="pill ${st.cls}" style="font-size:14px;padding:6px 18px;">${st.lbl}</span>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px;">
          <div style="background:#f8f9fa;padding:12px;border-radius:8px;border-left:4px solid #1a237e;">
            <div style="font-size:11px;color:#888;margin-bottom:4px;">${isAr?'القسم':'Department'}</div>
            <div style="font-weight:700;">${isAr?r.deptAr:r.dept}</div>
          </div>
          <div style="background:#f8f9fa;padding:12px;border-radius:8px;border-left:4px solid #1a237e;">
            <div style="font-size:11px;color:#888;margin-bottom:4px;">${isAr?'تاريخ الطلب':'Date'}</div>
            <div style="font-weight:700;">${r.date}</div>
          </div>
          <div style="background:#f8f9fa;padding:12px;border-radius:8px;border-left:4px solid #1a237e;">
            <div style="font-size:11px;color:#888;margin-bottom:4px;">${isAr?'الأولوية':'Priority'}</div>
            <div style="font-weight:700;color:${r.priority==='urgent'?'var(--amber)':r.priority==='critical'?'var(--red)':'var(--text)'};">${r.priority==='urgent'?(isAr?'عاجل':'Urgent'):r.priority==='critical'?(isAr?'حرج':'Critical'):(isAr?'عادي':'Normal')}</div>
          </div>
          <div style="background:#f8f9fa;padding:12px;border-radius:8px;border-left:4px solid #1a237e;">
            <div style="font-size:11px;color:#888;margin-bottom:4px;">${isAr?'السبب':'Reason'}</div>
            <div style="font-weight:700;">${r.reason || (isAr?'—':'—')}</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <thead>
            <tr style="background:#1a237e;color:#fff;">
              <th style="padding:10px;border:1px solid #1a237e;width:40px;">#</th>
              <th style="padding:10px;border:1px solid #1a237e;">${isAr?'الصنف':'Item'}</th>
              <th style="padding:10px;border:1px solid #1a237e;width:80px;">${isAr?'الكمية':'Qty'}</th>
              <th style="padding:10px;border:1px solid #1a237e;">${isAr?'القسم':'Department'}</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div style="margin-top:30px;padding-top:15px;border-top:1px solid #ddd;display:flex;justify-content:space-around;text-align:center;font-size:12px;color:#888;">
          <div><div style="border-top:1.5px solid #333;width:140px;padding-top:6px;">${isAr?'التوقيع':'Signature'}</div></div>
          <div><div style="border-top:1.5px solid #333;width:140px;padding-top:6px;">${isAr?'الموافقة':'Approval'}</div></div>
          <div><div style="border-top:1.5px solid #333;width:140px;padding-top:6px;">${isAr?'الاستلام':'Received'}</div></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

/* ===================================================================
   DELETE ISSUE
=================================================================== */
async function deleteIssue(idx){
  const r = reqsData[idx];
  if(!r) return;
  const ok = await showConfirm(lang==='en'?`Delete request "${r.id}"?`:`حذف الطلب "${r.id}"؟`);
  if(!ok) return;
  reqsData.splice(idx, 1);
  navigate('issues');
  showToast(lang==='en'?'Request deleted!':'تم حذف الطلب!');
}

function toggleReqStatus(idx){
  const r = reqsData[idx];
  if(!r) return;
  r.status = r.status === 'approved' ? 'pending' : 'approved';
  navigate('issues');
}

/* ===================================================================
   ISSUE REQUEST MODAL
=================================================================== */
let editingReqIdx = null;
function openIssueModal(idx){
  editingReqIdx = idx;
  const isEdit = idx !== null && idx !== undefined;
  const L=STR[lang];
  const r = isEdit ? reqsData[idx] : null;
  document.getElementById('issueModalTitle').textContent=isEdit?(lang==='en'?'Edit Material Request':'تعديل طلب الصرف'):L.issues.newRequest;
  document.getElementById('issueLblDept').textContent=L.issues.department||(lang==='en'?'Department':'القسم');
  document.getElementById('issueLblPriority').textContent=L.issues.priority||(lang==='en'?'Priority':'الأولوية');
  document.getElementById('issueLblItem').textContent=lang==='en'?'Material / Item':'المادة / الصنف';
  document.getElementById('issueLblQty').textContent=L.issues.requiredQty||(lang==='en'?'Required Quantity':'الكمية المطلوبة');
  document.getElementById('issueLblDate').textContent=L.issues.requiredDate||(lang==='en'?'Required Date':'تاريخ الحاجة');
  document.getElementById('issueLblReason').textContent=L.issues.reason||(lang==='en'?'Reason / Purpose':'السبب / الغرض');
  document.getElementById('issueSave').textContent=isEdit?(lang==='en'?'Save Changes':'حفظ التغييرات'):L.issues.submitRequest;
  document.getElementById('issueCancel').textContent=L.modal.cancel;
  const pri=document.getElementById('issuePriority');
  if(lang==='ar'){pri.options[0].text='عادي';pri.options[1].text='عاجل';pri.options[2].text='حرج';}
  else{pri.options[0].text='Normal';pri.options[1].text='Urgent';pri.options[2].text='Critical';}
  const depts_en=['Production Line 1','Production Line 2','Assembly Line 1','Assembly Line 2','Maintenance','Quality Control'];
  const depts_ar=['خط الإنتاج 1','خط الإنتاج 2','خط التجميع 1','خط التجميع 2','الصيانة','مراقبة الجودة'];
  const ds=document.getElementById('issueDept');
  const depts=lang==='ar'?depts_ar:depts_en;
  ds.innerHTML=depts.map(d=>`<option>${d}</option>`).join('');
  if(isEdit && r) ds.value = r.dept;
  const sel=document.getElementById('issueItem');
  sel.innerHTML=inventoryData.map(i=>`<option value="${i.sku}">${lang==='en'?i.name:i.nameAr}</option>`).join('');
  if(isEdit && r) sel.value = r.sku;
  document.getElementById('issueQty').value = isEdit && r ? r.qty : '';
  document.getElementById('issueDate').value = isEdit && r ? r.date : new Date().toISOString().split('T')[0];
  document.getElementById('issueReason').value = isEdit && r ? r.reason : '';
  if(isEdit && r) pri.value = r.priority || 'normal';
  document.getElementById('issueModalOverlay').classList.add('show');
}
function closeIssueModal(){document.getElementById('issueModalOverlay').classList.remove('show');}
document.getElementById('issueCancel').addEventListener('click',closeIssueModal);
document.getElementById('issueModalOverlay').addEventListener('click',e=>{if(e.target.id==='issueModalOverlay')closeIssueModal();});
document.getElementById('issueSave').addEventListener('click',()=>{
  const L=STR[lang];
  if(!(parseInt(document.getElementById('issueQty').value)||0)){document.getElementById('issueQty').focus();return;}
  const dept = document.getElementById('issueDept').value;
  const deptAr = {1:'خط الإنتاج 1',2:'خط الإنتاج 2',3:'خط التجميع 1',4:'خط التجميع 2',5:'الصيانة',6:'مراقبة الجودة'}[document.getElementById('issueDept').selectedIndex+1] || dept;
  const sku = document.getElementById('issueItem').value;
  const itemSel = document.getElementById('issueItem');
  const item = itemSel.options[itemSel.selectedIndex]?.text || '';
  const itemAr = item; // simplified
  const qty = parseInt(document.getElementById('issueQty').value);
  const date = document.getElementById('issueDate').value;
  const reason = document.getElementById('issueReason').value.trim();
  const priority = document.getElementById('issuePriority').value;
  const depts_en=['Production Line 1','Production Line 2','Assembly Line 1','Assembly Line 2','Maintenance','Quality Control'];
  const depts_ar=['خط الإنتاج 1','خط الإنتاج 2','خط التجميع 1','خط التجميع 2','الصيانة','مراقبة الجودة'];
  const deptIdx = document.getElementById('issueDept').selectedIndex;
  if(editingReqIdx !== null && editingReqIdx !== undefined){
    reqsData[editingReqIdx] = { ...reqsData[editingReqIdx], dept:depts_en[deptIdx]||dept, deptAr:depts_ar[deptIdx]||deptAr, sku, item, itemAr, qty, date, reason, priority };
  } else {
    const maxId = reqsData.reduce((m,r)=>Math.max(m, parseInt(r.id.replace('REQ-',''))||0), 0);
    reqsData.push({ id:'REQ-'+(maxId+1), dept:depts_en[deptIdx]||dept, deptAr:depts_ar[deptIdx]||deptAr, sku, item, itemAr, qty, date, reason, priority, status:'pending' });
  }
  closeIssueModal();
  navigate('issues');
  showToast(editingReqIdx!==null?(lang==='en'?'Request updated!':'تم تحديث الطلب!'):L.issues.requestAdded||(lang==='en'?'Material request submitted!':'تم إرسال طلب الصرف بنجاح!'));
  editingReqIdx = null;
});

/* ===================================================================
   WAREHOUSE ADD / EDIT MODAL
=================================================================== */
let editingWhIndex=null;
function openWhModal(idx){
  const L=STR[lang];
  editingWhIndex=idx;
  const isEdit=(idx!==null && idx!==undefined);
  document.getElementById('whModalTitle').textContent=isEdit?(L.wh.editWarehouse||'Edit Warehouse'):(L.wh.addWarehouse||'Add Warehouse');
  document.getElementById('whLblName').textContent=L.wh.whNameEn||'Name (EN)';
  document.getElementById('whLblNameAr').textContent=L.wh.whNameAr||'Name (AR)';
  document.getElementById('whLblSections').textContent=L.wh.sections||'Sections';
  document.getElementById('whLblOcc').textContent=(L.wh.occupancy||'Occupancy')+' (%)';
  document.getElementById('whLblCapacity').textContent=L.wh.capacity||'Capacity';
  document.getElementById('whLblCurrent').textContent=L.wh.current||'Current Items';
  document.getElementById('whSave').textContent=lang==='en'?'Save Warehouse':'حفظ المستودع';
  document.getElementById('whCancel').textContent=L.modal.cancel;
  if(!isEdit){
    ['whName','whNameAr','whSections','whOcc','whCapacity','whCurrent'].forEach(id=>document.getElementById(id).value='');
  } else {
    const w=warehouseData[idx];
    document.getElementById('whName').value=w.name;
    document.getElementById('whNameAr').value=w.nameAr;
    document.getElementById('whSections').value=w.sections;
    document.getElementById('whOcc').value=w.occ;
    const parts=w.items.split('/');
    document.getElementById('whCurrent').value=(parts[0]||'').trim();
    document.getElementById('whCapacity').value=(parts[1]||'').trim();
  }
  document.getElementById('whModalOverlay').classList.add('show');
}
function closeWhModal(){document.getElementById('whModalOverlay').classList.remove('show');editingWhIndex=null;}
document.getElementById('whCancel').addEventListener('click',closeWhModal);
document.getElementById('whModalOverlay').addEventListener('click',e=>{if(e.target.id==='whModalOverlay')closeWhModal();});
document.getElementById('whSave').addEventListener('click',()=>{
  const L=STR[lang];
  const name=document.getElementById('whName').value.trim();
  const nameAr=document.getElementById('whNameAr').value.trim();
  if(!name){document.getElementById('whName').focus();return;}
  const occ=Math.min(100,Math.max(0,parseInt(document.getElementById('whOcc').value)||0));
  const sections=Math.max(1,parseInt(document.getElementById('whSections').value)||1);
  const cap=document.getElementById('whCapacity').value.trim()||'0';
  const cur=document.getElementById('whCurrent').value.trim()||'0';
  const occColor=occ>=90?'var(--red)':occ>=60?'var(--blue)':'var(--green)';
  if(editingWhIndex===null||editingWhIndex===undefined){
    warehouseData.push({name,nameAr:nameAr||name,occ,items:cur+' / '+cap,sections,color:occColor});
  } else {
    const w={...warehouseData[editingWhIndex]};
    w.name=name; w.nameAr=nameAr||name; w.occ=occ; w.items=cur+' / '+cap; w.sections=sections; w.color=occColor;
    warehouseData[editingWhIndex]=w;
  }
  closeWhModal();
  showToast(lang==='en'?'Warehouse saved!':'تم حفظ المستودع بنجاح!');
  navigate('warehouses');
});

/* ===================================================================
   PROFILE MODAL
=================================================================== */
const profileData={id:'profile',name:'Sarah Chen',role:'Administrator',roleAr:'مدير النظام',email:'sarah@factorylogix.com',image:null,initials:'SC'};
let profileImgData=null;

function getInitials(name){
  const p=name.trim().split(/\s+/);
  return((p[0]?p[0][0]:'')+(p[1]?p[1][0]:'')).toUpperCase()||'?';
}

function refreshTopbarProfile(){
  const nameEl=document.getElementById('userName');
  if(nameEl) nameEl.textContent=profileData.name;
  const av=document.querySelector('.topbar .avatar');
  if(!av) return;
  if(profileData.image){
    av.innerHTML=`<img src="${profileData.image}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
    av.style.background='none';
  } else {
    av.innerHTML=profileData.initials;
    av.style.background='linear-gradient(135deg,var(--blue),#7CB2FF)';
  }
}

function setProfilePreview(src){
  const av=document.getElementById('profileAvatarPreview');
  const rm=document.getElementById('profileImgRemoveBtn');
  if(src){
    av.innerHTML=`<img src="${src}" alt="">`;
    rm.style.display='';
  } else {
    av.textContent=profileData.initials;
    rm.style.display='none';
  }
}

function openProfileModal(){
  const L=STR[lang];
  document.getElementById('profileModalTitle').textContent=lang==='en'?'Edit Profile':'تعديل الملف الشخصي';
  document.getElementById('profileLblName').textContent=lang==='en'?'Full Name':'الاسم الكامل';
  document.getElementById('profileLblRole').textContent=lang==='en'?'Role':'الدور الوظيفي';
  document.getElementById('profileLblEmail').textContent=lang==='en'?'Email':'البريد الإلكتروني';
  document.getElementById('profileImgUploadBtn').textContent=lang==='en'?'Change Photo':'تغيير الصورة';
  document.getElementById('profileImgRemoveBtn').textContent=lang==='en'?'Remove Photo':'إزالة الصورة';
  document.getElementById('profileSave').textContent=lang==='en'?'Save Changes':'حفظ التعديلات';
  document.getElementById('profileCancel').textContent=L.modal.cancel;
  document.getElementById('profileName').value=profileData.name;
  document.getElementById('profileRole').value=lang==='en'?profileData.role:profileData.roleAr;
  document.getElementById('profileEmail').value=profileData.email;
  profileImgData=profileData.image;
  setProfilePreview(profileImgData);
  document.getElementById('profileModalOverlay').classList.add('show');
}
function closeProfileModal(){document.getElementById('profileModalOverlay').classList.remove('show');}
document.getElementById('profileCancel').addEventListener('click',closeProfileModal);
document.getElementById('profileModalOverlay').addEventListener('click',e=>{if(e.target.id==='profileModalOverlay')closeProfileModal();});
document.getElementById('profileImgUploadBtn').addEventListener('click',()=>document.getElementById('profileImgFile').click());
document.getElementById('profileImgFile').addEventListener('change',e=>{
  const file=e.target.files[0];
  if(!file||!file.type.startsWith('image/')) return;
  const r=new FileReader();
  r.onload=ev=>{profileImgData=ev.target.result;setProfilePreview(profileImgData);};
  r.readAsDataURL(file);
  e.target.value='';
});
document.getElementById('profileImgRemoveBtn').addEventListener('click',()=>{
  profileImgData=null;
  setProfilePreview(null);
});
document.getElementById('profileSave').addEventListener('click',()=>{
  const name=document.getElementById('profileName').value.trim();
  if(!name){document.getElementById('profileName').focus();return;}
  profileData.name=name;
  profileData.email=document.getElementById('profileEmail').value.trim();
  profileData.image=profileImgData;
  profileData.initials=getInitials(name);
  if(window.StockFlowBackend && window.StockFlowBackend.enabled){
    window.StockFlowBackend.syncCollection('profile', [profileData], 'id');
  }
  closeProfileModal();
  refreshTopbarProfile();
  showToast(lang==='en'?'Profile updated successfully!':'تم تحديث الملف الشخصي بنجاح!');
});
// Wire user-chip click → open profile modal
document.querySelector('.user-chip').addEventListener('click', openProfileModal);
// Wire notification bell → navigate to notifications
document.getElementById('notifBtn').addEventListener('click', function(e){
  e.stopPropagation();
  const dd = document.getElementById('notifDropdown');
  if(dd.classList.contains('open')){
    dd.classList.remove('open');
    return;
  }
  // populate dropdown
  const L = STR[lang];
  const todayStr = fmtDate(new Date());
  const todayEvents = getEventsForDate(todayStr);
  const items = [
    ...todayEvents.map(e=>({icon:ICONS.clock,c:'var(--blue)',bg:'var(--blue-soft)', title: L.calendar.eventNotifPrefix+': '+e.name, time: e.time||'—'})),
    ...getNotifItems(),
  ];
  document.getElementById('notifDropTitle').textContent = L.notifList || (lang==='en'?'Notifications':'التنبيهات');
  document.getElementById('notifDropCount').textContent = items.length;
  document.getElementById('notifDropBody').innerHTML = items.map(n=>`<div class="alert-row">
    <div class="alert-icon" style="background:${n.bg};color:${n.c}">${n.icon}</div>
    <div class="alert-mid"><div class="alert-name">${n.title}</div></div>
    <div class="activity-time">${n.time}</div>
  </div>`).join('');
  document.getElementById('notifDropViewAll').textContent = lang==='en'?'View All':'عرض الكل';
  dd.classList.add('open');
});
// close dropdown on outside click
document.addEventListener('click', function(e){
  const dd = document.getElementById('notifDropdown');
  const btn = document.getElementById('notifBtn');
  if(dd.classList.contains('open') && !dd.contains(e.target) && !btn.contains(e.target)){
    dd.classList.remove('open');
  }
  const calDd = document.getElementById('calDropdown');
  const calBtn = document.getElementById('calendarBtn');
  if(calDd.classList.contains('open') && !calDd.contains(e.target) && !calBtn.contains(e.target)){
    calDd.classList.remove('open');
    document.getElementById('calAddForm').classList.remove('open');
  }
});
// view all → navigate to notifications page
document.getElementById('notifDropViewAll').addEventListener('click', function(){
  document.getElementById('notifDropdown').classList.remove('open');
  navigate('notifications');
});

/* ===================================================================
   CALENDAR
=================================================================== */
let CAL_EVENTS = [];
try { const s = localStorage.getItem('stockflow_cal_events'); if(s) CAL_EVENTS = JSON.parse(s); } catch(e){}
function saveCalEvents(){ localStorage.setItem('stockflow_cal_events', JSON.stringify(CAL_EVENTS)); }

let calDate = new Date();
let calSelected = null; // YYYY-MM-DD

function fmtDate(d){ const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), day=String(d.getDate()).padStart(2,'0'); return y+'-'+m+'-'+day; }

function getEventsForDate(dateStr){ return CAL_EVENTS.filter(e=>e.date===dateStr); }

function renderCalendar(){
  const L = STR[lang];
  const d = new Date(calDate);
  const year = d.getFullYear(), month = d.getMonth();
  d.setDate(1);
  const startDay = d.getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const todayStr = fmtDate(new Date());

  document.getElementById('calTitle').textContent = L.calendar.monthNames[month] + ' ' + year;

  let html = '';
  // day names
  L.calendar.dayNames.forEach(n=>{ html += '<div class="cal-day">'+n+'</div>'; });
  // prev month cells
  for(let i=startDay-1; i>=0; i--){
    const day = daysInPrev - i;
    const m = month===0?11:month-1;
    const y = month===0?year-1:year;
    html += '<div class="cal-cell other" data-date="">'+day+'</div>';
  }
  // current month cells
  for(let day=1; day<=daysInMonth; day++){
    const dateObj = new Date(year, month, day);
    const dateStr = fmtDate(dateObj);
    const isToday = dateStr===todayStr;
    const hasEvent = getEventsForDate(dateStr).length>0;
    const isSelected = dateStr===calSelected;
    html += '<div class="cal-cell'+(isToday?' today':'')+(hasEvent?' has-event':'')+(isSelected?' selected':'')+'" data-date="'+dateStr+'">'+day+'</div>';
  }
  // next month cells
  const totalCells = startDay + daysInMonth;
  const remaining = (7 - totalCells%7)%7;
  for(let i=1; i<=remaining; i++){
    html += '<div class="cal-cell other" data-date="">'+i+'</div>';
  }
  document.getElementById('calGrid').innerHTML = html;

  // select today by default
  if(!calSelected) calSelected = todayStr;
  renderCalEvents();
}

function renderCalEvents(){
  const L = STR[lang];
  const events = getEventsForDate(calSelected);
  const titleEl = document.getElementById('calEventsTitle');
  const bodyEl = document.getElementById('calEventsBody');
  if(titleEl) titleEl.textContent = calSelected===fmtDate(new Date()) ? (L.notif.todayTitle||'Today') : (calSelected||'—');
  if(bodyEl) bodyEl.innerHTML = events.length
    ? events.map(e=>'<div class="cal-event-item"><div class="cal-event-dot"></div><div class="cal-event-name">'+escapeHtml(e.name)+'</div><div class="cal-event-time">'+(e.time||'—')+'</div><button class="cal-event-del" data-id="'+e.id+'">×</button></div>').join('')
    : '<div class="cal-no-events">'+L.calendar.noEvents+'</div>';
}

function escapeHtml(s){ return String(s).replace(/[&<>"]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m];}); }

// calendar button toggle
document.getElementById('calendarBtn').addEventListener('click', function(e){
  e.stopPropagation();
  const dd = document.getElementById('calDropdown');
  if(dd.classList.contains('open')){
    dd.classList.remove('open');
    document.getElementById('calAddForm').classList.remove('open');
    return;
  }
  // close notif dropdown if open
  document.getElementById('notifDropdown').classList.remove('open');
  renderCalendar();
  dd.classList.add('open');
});

// close calendar on outside click (consolidated handler above handles both dropdowns)

document.getElementById('calPrev').addEventListener('click', function(e){
  e.stopPropagation();
  calDate.setMonth(calDate.getMonth()-1);
  renderCalendar();
});

document.getElementById('calNext').addEventListener('click', function(e){
  e.stopPropagation();
  calDate.setMonth(calDate.getMonth()+1);
  renderCalendar();
});

document.getElementById('calGrid').addEventListener('click', function(e){
  const cell = e.target.closest('.cal-cell');
  if(!cell || !cell.dataset.date) return;
  document.querySelectorAll('#calGrid .cal-cell').forEach(c=>c.classList.remove('selected'));
  calSelected = cell.dataset.date;
  cell.classList.add('selected');
  renderCalEvents();
});

// add event form toggle
document.getElementById('calAddBtn').addEventListener('click', function(e){
  e.stopPropagation();
  const L = STR[lang];
  const form = document.getElementById('calAddForm');
  form.classList.toggle('open');
  if(form.classList.contains('open')){
    document.getElementById('calEventName').value = '';
    document.getElementById('calEventDate').value = calSelected;
    document.getElementById('calEventTime').value = '';
    // update labels for selected date
    const saveBtn = document.getElementById('calSaveBtn');
    saveBtn.textContent = L.calendar.btnAdd;
    document.getElementById('calCancelBtn').textContent = L.calendar.btnCancel;
    document.getElementById('calEventName').placeholder = L.calendar.eventName;
    document.getElementById('calEventName').focus();
  }
});

document.getElementById('calCancelBtn').addEventListener('click', function(e){
  e.stopPropagation();
  document.getElementById('calAddForm').classList.remove('open');
});

document.getElementById('calSaveBtn').addEventListener('click', function(e){
  e.stopPropagation();
  const L = STR[lang];
  const name = document.getElementById('calEventName').value.trim();
  const date = document.getElementById('calEventDate').value;
  const time = document.getElementById('calEventTime').value;
  if(!name){ showToast(lang==='en'?'Please enter an event name':'الرجاء إدخال اسم الموعد'); return; }
  if(!date){ showToast(lang==='en'?'Please select a date':'الرجاء اختيار التاريخ'); return; }
  const ev = { id: Date.now()+'_'+Math.random().toString(36).slice(2,6), name: name, date: date, time: time };
  CAL_EVENTS.push(ev);
  saveCalEvents();
  document.getElementById('calAddForm').classList.remove('open');
  calSelected = date;
  renderCalendar();
  showToast(lang==='en'?'Event added!':'تم إضافة الموعد!');
});

document.getElementById('calEventsBody').addEventListener('click', function(e){
  const del = e.target.closest('.cal-event-del');
  if(!del) return;
  e.stopPropagation();
  const id = del.dataset.id;
  CAL_EVENTS = CAL_EVENTS.filter(e=>String(e.id)!==String(id));
  saveCalEvents();
  renderCalEvents();
  // re-render grid to update dots
  const cells = document.querySelectorAll('#calGrid .cal-cell');
  cells.forEach(c=>{
    if(c.dataset.date){
      c.classList.toggle('has-event', getEventsForDate(c.dataset.date).length>0);
    }
  });
});



/* ===================================================================
   TRANSFER STOCK MODAL
=================================================================== */
function openTransferModal(preFrom=null){
  const L = STR[lang];
  document.getElementById('transferModalTitle').textContent  = L.wh.transferTitle   || 'Transfer Stock';
  document.getElementById('transferLblFrom').textContent     = L.wh.transferFrom    || 'From';
  document.getElementById('transferLblTo').textContent       = L.wh.transferTo      || 'To';
  document.getElementById('transferLblItem').textContent     = L.wh.transferItem    || 'Item';
  document.getElementById('transferLblQty').textContent      = L.wh.transferQty     || 'Quantity';
  document.getElementById('transferLblNote').textContent     = L.wh.transferNote    || 'Notes';
  document.getElementById('transferSubmit').textContent      = L.wh.transferSubmit  || 'Execute';
  document.getElementById('transferCancel').textContent      = L.modal.cancel;

  // Populate warehouse dropdowns
  const whOptions = warehouseData.map((w,i)=>`<option value="${i}">${lang==='en'?w.name:w.nameAr}</option>`).join('');
  document.getElementById('transferFrom').innerHTML = whOptions;
  document.getElementById('transferTo').innerHTML   = whOptions;
  if(warehouseData.length>1) document.getElementById('transferTo').selectedIndex = 1;
  if(preFrom!==null) document.getElementById('transferFrom').value = preFrom;

  // Populate items dropdown
  document.getElementById('transferItem').innerHTML =
    inventoryData.map((i,idx)=>`<option value="${idx}">${lang==='en'?i.name:i.nameAr} (${i.stock})</option>`).join('');

  document.getElementById('transferQty').value  = '';
  document.getElementById('transferNote').value = '';
  updateTransferInfo();
  document.getElementById('transferModalOverlay').classList.add('show');
}
function closeTransferModal(){ document.getElementById('transferModalOverlay').classList.remove('show'); }
document.getElementById('transferCancel').addEventListener('click', closeTransferModal);
document.getElementById('transferModalOverlay').addEventListener('click', e=>{ if(e.target.id==='transferModalOverlay') closeTransferModal(); });

function updateTransferInfo(){
  const fromIdx = parseInt(document.getElementById('transferFrom').value);
  const toIdx   = parseInt(document.getElementById('transferTo').value);
  const itemIdx = parseInt(document.getElementById('transferItem').value);
  const L = STR[lang];
  if(isNaN(fromIdx)||isNaN(toIdx)||isNaN(itemIdx)) return;
  const fromName = lang==='en'?warehouseData[fromIdx]?.name:warehouseData[fromIdx]?.nameAr;
  const toName   = lang==='en'?warehouseData[toIdx]?.name:warehouseData[toIdx]?.nameAr;
  const item     = inventoryData[itemIdx];
  if(!fromName||!toName||!item) return;
  document.getElementById('transferInfo').textContent =
    lang==='en'
      ? `Transfer "${lang==='en'?item.name:item.nameAr}" from ${fromName} → ${toName}. Available: ${item.stock} units.`
      : `تحويل "${item.nameAr}" من ${fromName} إلى ${toName}. المتاح: ${item.stock} وحدة.`;
}
['transferFrom','transferTo','transferItem'].forEach(id=>{
  document.getElementById(id).addEventListener('change', updateTransferInfo);
});

document.getElementById('transferSubmit').addEventListener('click', ()=>{
  const L = STR[lang];
  const fromIdx = parseInt(document.getElementById('transferFrom').value);
  const toIdx   = parseInt(document.getElementById('transferTo').value);
  const itemIdx = parseInt(document.getElementById('transferItem').value);
  const qty     = parseInt(document.getElementById('transferQty').value)||0;
  const note    = document.getElementById('transferNote').value.trim();

  if(isNaN(fromIdx)||isNaN(toIdx)||isNaN(itemIdx)||!qty){
    showToast(L.wh.transferErr||(lang==='en'?'Please fill all required fields':'يرجى تعبئة جميع الحقول'));
    return;
  }
  if(fromIdx===toIdx){
    showToast(lang==='en'?'Source and destination must be different':'يجب أن يكون المصدر والوجهة مختلفين');
    return;
  }
  const item = inventoryData[itemIdx];
  if(qty > item.stock){
    showToast(lang==='en'?`Not enough stock. Available: ${item.stock}`:`الكمية المتاحة فقط: ${item.stock}`);
    return;
  }

  // Execute transfer: deduct from item stock (simple prototype logic)
  inventoryData[itemIdx].stock -= qty;

  // Log the movement
  const fromName = lang==='en'?warehouseData[fromIdx].name:warehouseData[fromIdx].nameAr;
  const toName   = lang==='en'?warehouseData[toIdx].name:warehouseData[toIdx].nameAr;
  const ref = 'TRF-'+(300+movementsData.length);
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'});
  movementsData.unshift({
    type:'transfer',
    ref,
    item: item.name,
    itemAr: item.nameAr,
    qty: qty+' pcs',
    wh: `${fromName} → ${toName}`,
    time: timeStr,
    note
  });

  closeTransferModal();
  showToast(L.wh.transferDone||(lang==='en'?'Transfer completed successfully!':'تم التحويل بنجاح!'));
  if(typeof saveAllData === 'function') saveAllData();
  navigate('warehouses');
});

/* ===================================================================
   DELETE WAREHOUSE MODAL
=================================================================== */
let deletingWhIndex = null;
function openWhDeleteModal(idx){
  const L = STR[lang];
  deletingWhIndex = idx;
  const w = warehouseData[idx];
  document.getElementById('whDeleteTitle').textContent =
    L.wh.deleteWhTitle || (lang==='en'?'Delete this warehouse?':'حذف هذا المستودع؟');
  document.getElementById('whDeleteBody').textContent =
    (L.wh.deleteWhBody || 'This will permanently remove "{name}".')
      .replace('{name}', lang==='en'?w.name:w.nameAr);
  document.getElementById('whDeleteCancel').textContent  = L.modal.cancel;
  document.getElementById('whDeleteConfirm').textContent = L.wh.deleteWh || (lang==='en'?'Delete':'حذف');
  document.getElementById('whDeleteModalOverlay').classList.add('show');
}
function closeWhDeleteModal(){ document.getElementById('whDeleteModalOverlay').classList.remove('show'); deletingWhIndex=null; }
document.getElementById('whDeleteCancel').addEventListener('click', closeWhDeleteModal);
document.getElementById('whDeleteModalOverlay').addEventListener('click', e=>{ if(e.target.id==='whDeleteModalOverlay') closeWhDeleteModal(); });
document.getElementById('whDeleteConfirm').addEventListener('click', ()=>{
  if(deletingWhIndex===null) return;
  warehouseData.splice(deletingWhIndex, 1);
  closeWhDeleteModal();
  showToast(lang==='en'?'Warehouse deleted.':'تم حذف المستودع.');
  if(typeof saveAllData === 'function') saveAllData();
  navigate('warehouses');
});

function orderNow(sku){
  const item = inventoryData.find(i=>i.sku===sku);
  if(item){
    showToast((lang==='ar'?'جارٍ فتح أمر الشراء لـ ':'Opening PO for ') + (lang==='ar'?item.nameAr:item.name));
  }
  navigate('purchases');
}
/* ===================================================================
   SIDEBAR TOGGLE
=================================================================== */
let sidebarCollapsed = false;

window.addEventListener('resize', ()=>{
  if(window.innerWidth > 900){
    document.getElementById('sidebar')?.classList.remove('open');
    document.querySelector('.app')?.classList.remove('has-sidebar-open');
  }
});

function setSidebar(collapsed){
  sidebarCollapsed = collapsed;
  const sb = document.getElementById('sidebar');
  if(!sb) return;
  if(collapsed){ sb.classList.add('collapsed'); }
  else { sb.classList.remove('collapsed'); }
  // persist
  try{ localStorage.setItem('fl_sidebar', collapsed?'1':'0'); }catch(e){}
  if(typeof window.electronAPI !== 'undefined'){
    window.electronAPI.store.set('settings_sidebar', collapsed);
  }
}

['click','touchstart'].forEach(evt => {
  document.getElementById('sidebarToggle')?.addEventListener(evt, e=>{
    e.preventDefault();
    if(window.innerWidth <= 900){
      document.getElementById('sidebar').classList.toggle('open');
      document.querySelector('.app').classList.toggle('has-sidebar-open');
    } else {
      setSidebar(!sidebarCollapsed);
    }
  }, {passive:false});
});
['click','touchstart'].forEach(evt => {
  document.getElementById('sidebarMobileBtn')?.addEventListener(evt, e=>{
    e.preventDefault();
    document.getElementById('sidebar').classList.toggle('open');
    document.querySelector('.app').classList.toggle('has-sidebar-open');
  }, {passive:false});
});
['click','touchstart'].forEach(evt => {
  document.getElementById('sidebarCloseBtn')?.addEventListener(evt, e=>{
    e.preventDefault();
    document.getElementById('sidebar').classList.remove('open');
    document.querySelector('.app')?.classList.remove('has-sidebar-open');
  }, {passive:false});
});
// Close sidebar when tapping overlay on mobile
document.querySelector('.app')?.addEventListener('click', function(e){
  if(window.innerWidth <= 900 && this.classList.contains('has-sidebar-open') && !e.target.closest('.sidebar') && !e.target.closest('#sidebarMobileBtn')){
    document.getElementById('sidebar').classList.remove('open');
    this.classList.remove('has-sidebar-open');
  }
});

// Mobile search toggle
['click','touchstart'].forEach(evt => {
  document.getElementById('mobileSearchBtn')?.addEventListener(evt, e=>{
    e.preventDefault();
    document.getElementById('globalSearchWrap').classList.toggle('open');
    if(document.getElementById('globalSearchWrap').classList.contains('open')){
      document.getElementById('globalSearch').focus();
    }
  }, {passive:false});
});
['click','touchstart'].forEach(evt => {
  document.getElementById('searchCloseBtn')?.addEventListener(evt, e=>{
    e.preventDefault();
    document.getElementById('globalSearchWrap').classList.remove('open');
  }, {passive:false});
});

// table scroll indicator on mobile
function updateTableScrollHints(){
  const hint = lang==='en' ? '→ scroll →' : '→ تمرير ←';
  document.querySelectorAll('.table-card').forEach(tc => {
    const hasScroll = tc.scrollWidth > tc.clientWidth;
    tc.classList.toggle('has-scroll', hasScroll);
    if(hasScroll) tc.dataset.scrollHint = hint;
  });
}
updateTableScrollHints();
window.addEventListener('resize', updateTableScrollHints);
// recheck after page navigation
const _origNav = navigate;
navigate = function(page){
  _origNav(page);
  setTimeout(updateTableScrollHints, 50);
};

// Restore saved state
(function restoreSidebar(){
  if(window.innerWidth <= 900) return; // don't restore collapsed state on mobile
  try{
    const saved = localStorage.getItem('fl_sidebar');
    if(saved==='1') setSidebar(true);
  }catch(e){}
})();

/* ===================================================================
   THEME / LANG
=================================================================== */
function toggleTheme(){
  theme = theme==='light' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', theme);
  document.getElementById('themeIcon').innerHTML = theme==='dark'
    ? '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>'
    : '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>';
  navigate(currentPage);
}

function applyStaticI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const val = t(el.dataset.i18n);
    if(val!==null) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el=>{
    const val = t(el.dataset.i18nPh);
    if(val!==null) el.placeholder = val;
  });
}

function applyLang(){
  document.documentElement.lang = lang;
  document.documentElement.dir = lang==='ar' ? 'rtl' : 'ltr';
  applyStaticI18n();
  navigate(currentPage);
}

document.getElementById('langToggle').addEventListener('click', ()=>{
  lang = lang==='en' ? 'ar' : 'en';
  applyLang();
});
document.getElementById('themeToggle').addEventListener('click', toggleTheme);

document.getElementById('layoutBtn').addEventListener('click', function(){
  dashCustomizing = !dashCustomizing;
  this.classList.toggle('active', dashCustomizing);
  navigate('dashboard');
});

document.getElementById('content').addEventListener('click', function(e){
  const arrow = e.target.closest('.dash-arrow');
  if(!arrow) return;
  const key = arrow.dataset.sk;
  const dir = arrow.classList.contains('up') ? -1 : 1;
  const order = getDashSections();
  const idx = order.indexOf(key);
  if(idx===-1) return;
  const newIdx = idx + dir;
  if(newIdx<0 || newIdx>=order.length) return;
  order.splice(idx, 1);
  order.splice(newIdx, 0, key);
  saveDashSections(order);
  navigate('dashboard');
});

document.getElementById('content').addEventListener('click', function(e){
  if(e.target.id === 'dashCustDone'){
    dashCustomizing = false;
    navigate('dashboard');
  }
});

/* ===================================================================
   INIT
=================================================================== */
/* ===================================================================
   LOGIN
=================================================================== */
const LOGIN_USERS = [{ username:'admin', password:encodePW('123456'), name:'Sarah Chen', role:'Administrator', roleAr:'مدير النظام' }];
syncLoginUsers();

const loginI18n = {
  en:{ title:'StockFlow', sub:'Smart Warehouse & Inventory Management', user:'Username', pass:'Password', btn:'Sign In', loading:'Signing in...', error:'Invalid username or password', hintUser:'Username:', hintPass:'Password:', lang:'العربية', remember:'Remember me' },
  ar:{ title:'ستوك فلو', sub:'إدارة المستودعات والمخزون الذكية', user:'اسم المستخدم', pass:'كلمة المرور', btn:'تسجيل الدخول', loading:'جارٍ التسجيل...', error:'اسم المستخدم أو كلمة المرور غير صحيحة', hintUser:'اسم المستخدم:', hintPass:'كلمة المرور:', lang:'English', remember:'تذكرني' },
};

function applyLoginLang(){
  const L = loginI18n[lang];
  document.getElementById('loginTitle').textContent = L.title;
  document.getElementById('loginSub').textContent = L.sub;
  document.getElementById('lblUsername').textContent = L.user;
  document.getElementById('lblPassword').textContent = L.pass;
  document.getElementById('loginBtnText').textContent = L.btn;
  document.getElementById('loginErrorMsg').textContent = L.error;
  document.getElementById('loginLangLabel').textContent = L.lang;
  document.getElementById('loginUsername').placeholder = L.user;
  document.getElementById('loginPassword').placeholder = L.pass;
  document.getElementById('lblRemember').textContent = L.remember;
  // remember me
  const saved = localStorage.getItem('stockflow_remember');
  if(saved){
    document.getElementById('rememberMe').checked = true;
    document.getElementById('loginUsername').value = saved;
  }
  document.documentElement.lang = lang;
  document.documentElement.dir = lang==='ar' ? 'rtl' : 'ltr';
}

function doLogout(){
  if(window.StockFlowBackend && window.StockFlowBackend.enabled){
    window.StockFlowBackend.signOutUser().catch(()=>{});
  }
  document.getElementById('mainApp').style.display = 'none';
  document.getElementById('loadingScreen').style.display = 'none';
  const ls = document.getElementById('loginScreen');
  ls.style.display = '';
  ls.style.opacity = '1';
  ls.style.transform = '';
  ls.style.transition = '';
  document.getElementById('loginPassword').value = '';
  document.getElementById('loginError').classList.remove('show');
  window.scrollTo(0,0);
  applyLoginLang();
}

function doLogin(){
  const uname = document.getElementById('loginUsername').value.trim();
  const upass = document.getElementById('loginPassword').value;
  const btn = document.getElementById('loginBtn');
  const errBox = document.getElementById('loginError');
  errBox.classList.remove('show');
  document.getElementById('loginUsername').classList.remove('error');
  document.getElementById('loginPassword').classList.remove('error');
  if(!uname || !upass){
    document.getElementById('loginUsername').classList.toggle('error', !uname);
    document.getElementById('loginPassword').classList.toggle('error', !upass);
    return;
  }
  // show loading
  btn.classList.add('loading');
  btn.disabled = true;

  // If a backend (Supabase) is configured and the entered username looks
  // like an email, try real backend sign-in first. Otherwise (or on
  // failure), fall back to the built-in demo credentials so the app still
  // works out of the box with no backend project set up.
  const tryBackendAuth = window.StockFlowBackend && window.StockFlowBackend.enabled && uname.includes('@');
  const backendAttempt = tryBackendAuth
    ? window.StockFlowBackend.signInWithEmail(uname, upass)
        .then(data => ({
          username: uname,
          password: encodePW(upass),
          name: (data.user && data.user.user_metadata && data.user.user_metadata.full_name) || uname.split('@')[0],
          role: 'Administrator',
          roleAr: 'مدير النظام'
        }))
        .catch(() => null)
    : Promise.resolve(undefined); // undefined = "didn't try", null = "tried and failed"

  backendAttempt
    .then(fbUser => new Promise(resolve => setTimeout(() => resolve(fbUser), 500)))
    .then(fbUser => {
    const user = fbUser !== undefined
      ? fbUser
      : LOGIN_USERS.find(u=> u.username===uname && u.password===encodePW(upass));
    btn.classList.remove('loading');
    btn.disabled = false;
    if(user){
      // remember me
      if(document.getElementById('rememberMe').checked){
        localStorage.setItem('stockflow_remember', uname);
      } else {
        localStorage.removeItem('stockflow_remember');
      }
      // update profile with logged-in user
      profileData.name = user.name;
      profileData.role = user.role;
      profileData.roleAr = user.roleAr;
      profileData.initials = (user.name.split(' ').map(w=>w[0]).join('').slice(0,2)).toUpperCase();
      // hide login, show loading
      const ls = document.getElementById('loginScreen');
      ls.style.opacity='0';
      ls.style.transform='scale(1.03)';
      ls.style.transition='opacity .4s ease, transform .4s ease';
      setTimeout(()=>{
        ls.style.display='none';
        const loadingEl = document.getElementById('loadingScreen');
        loadingEl.style.display='flex';
        setTimeout(()=>{
          loadingEl.style.display='none';
          document.getElementById('mainApp').style.display='flex';
          buildNav(); applyStaticI18n(); navigate('dashboard'); refreshTopbarProfile();
        }, 1800);
      }, 380);
    } else {
      errBox.classList.add('show');
      document.getElementById('loginUsername').classList.add('error');
      document.getElementById('loginPassword').classList.add('error');
      document.getElementById('loginPassword').value='';
      // shake card
      const card = document.querySelector('.login-card');
      card.style.animation='none';
      card.offsetHeight;
      card.style.animation='shake .4s var(--ease)';
    }
  });
}

// shake keyframe
const shakeStyle = document.createElement('style');
shakeStyle.textContent = '@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}';
document.head.appendChild(shakeStyle);

document.getElementById('loginBtn').addEventListener('click', doLogin);
document.getElementById('logoutBtn').addEventListener('click', doLogout);
document.getElementById('loginUsername').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('loginPassword').focus(); });
document.getElementById('loginPassword').addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });

// toggle password visibility
let pwVisible = false;
document.getElementById('togglePw').addEventListener('click', ()=>{
  pwVisible = !pwVisible;
  document.getElementById('loginPassword').type = pwVisible ? 'text' : 'password';
  document.getElementById('eyeIcon').innerHTML = pwVisible
    ? '<path d="M17.9 17.9A10.5 10.5 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.1-6.9M9.9 4.2A9.8 9.8 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.1 3.1M1 1l22 22"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/>';
});

// lang toggle on login screen
document.getElementById('loginLangBtn').addEventListener('click', ()=>{
  lang = lang==='en' ? 'ar' : 'en';
  applyLoginLang();
  // sync theme icon
  syncLoginThemeIcon();
});

// theme toggle on login screen
document.getElementById('loginThemeBtn').addEventListener('click', ()=>{
  theme = theme==='light' ? 'dark' : 'light';
  document.body.setAttribute('data-theme', theme);
  syncLoginThemeIcon();
});
function syncLoginThemeIcon(){
  document.getElementById('loginThemeIcon').innerHTML = theme==='dark'
    ? '<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>'
    : '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>';
}

// init login screen (don't auto-navigate to dashboard)
applyLoginLang();
buildNav();
applyStaticI18n();
