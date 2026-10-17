// Sample data for the Staff and Admin pages (Sprint 1 prototype, no backend).
// Field names follow the ER model so they map directly to MySQL columns in Sprint 2.

// Return a date string (YYYY-MM-DD) shifted by a number of days from today.
// Dates are relative so the document alerts stay realistic whenever the demo is opened.
function movioDateFromToday(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

const movioData = {
    // VEHICLE_TYPE entity.
    vehicleTypes: [
        { vehicle_type_id: 1, type_name: 'Bike' },
        { vehicle_type_id: 2, type_name: 'Moto' },
        { vehicle_type_id: 3, type_name: 'Van' },
        { vehicle_type_id: 4, type_name: 'Truck' }
    ],

    // USER entity: one table for every role (client, courier, staff, admin).
    // approval_status is used for couriers and staff; clients and admins are always approved.
    users: [
        { user_id: 1, username: 'admin', name: 'Admin Demo', email: 'admin@example.com', phone: '+351 910 000 000', nif: '500000000', role: 'admin', approval_status: 'approved', created_at: '2026-09-01' },
        { user_id: 2, username: 'aribeiro', name: 'Ana Ribeiro', email: 'ana.ribeiro@example.com', phone: '+351 912 345 001', nif: '231456780', role: 'staff', approval_status: 'approved', created_at: '2026-09-05' },
        { user_id: 3, username: 'psantos', name: 'Pedro Santos', email: 'pedro.santos@example.com', phone: '+351 912 345 002', nif: '248113902', role: 'staff', approval_status: 'approved', created_at: '2026-09-08' },
        { user_id: 4, username: 'ralves', name: 'Rui Alves', email: 'rui@example.com', phone: '+351 913 222 101', nif: '245118321', role: 'courier', approval_status: 'pending', created_at: movioDateFromToday(-2) },
        { user_id: 5, username: 'slima', name: 'Sofia Lima', email: 'sofia@example.com', phone: '+351 913 222 102', nif: '233670810', role: 'courier', approval_status: 'pending', created_at: movioDateFromToday(-3) },
        { user_id: 6, username: 'jpereira', name: 'Joao Pereira', email: 'joao.pereira@example.com', phone: '+351 913 222 103', nif: '219004556', role: 'courier', approval_status: 'approved', created_at: '2026-09-12' },
        { user_id: 7, username: 'mcosta', name: 'Marta Costa', email: 'marta.costa@example.com', phone: '+351 913 222 104', nif: '256771230', role: 'courier', approval_status: 'approved', created_at: '2026-09-15' },
        { user_id: 8, username: 'tsilva', name: 'Tiago Silva', email: 'tiago.silva@example.com', phone: '+351 913 222 105', nif: '262119874', role: 'courier', approval_status: 'rejected', created_at: '2026-09-20' },
        { user_id: 9, username: 'imartins', name: 'Ines Martins', email: 'ines.martins@example.com', phone: '+351 914 111 201', nif: '240998123', role: 'client', approval_status: 'approved', created_at: '2026-09-10' },
        { user_id: 10, username: 'bferreira', name: 'Bruno Ferreira', email: 'bruno.ferreira@example.com', phone: '+351 914 111 202', nif: '251334870', role: 'client', approval_status: 'approved', created_at: '2026-09-18' },
        { user_id: 11, username: 'csousa', name: 'Catarina Sousa', email: 'catarina.sousa@example.com', phone: '+351 914 111 203', nif: '227640115', role: 'client', approval_status: 'approved', created_at: '2026-09-25' },
        { user_id: 12, username: 'lgomes', name: 'Luis Gomes', email: 'luis.gomes@example.com', phone: '+351 914 111 204', nif: '239871006', role: 'client', approval_status: 'approved', created_at: '2026-10-02' }
    ],

    // VEHICLE entity. user_id is the courier that owns the vehicle.
    // documents_updated_at marks a new certificate upload (triggers an "updated" alert for Staff).
    vehicles: [
        { vehicle_id: 1, user_id: 6, vehicle_type_id: 3, license_plate: '72-ZP-11', model: 'Renault Master', max_weight_kg: 1200, max_vol_m3: 10.8, insurance_expiry_date: movioDateFromToday(200), inspection_expiry_date: movioDateFromToday(150), insurance_expiry_doc: 'insurance_72ZP11.pdf', inspection_expiry_doc: 'inspection_72ZP11.pdf', approval_status: 'pending', documents_updated_at: null, created_at: movioDateFromToday(-1) },
        { vehicle_id: 2, user_id: 7, vehicle_type_id: 2, license_plate: '19-CC-04', model: 'Yamaha NMAX', max_weight_kg: 30, max_vol_m3: 0.1, insurance_expiry_date: movioDateFromToday(-5), inspection_expiry_date: movioDateFromToday(90), insurance_expiry_doc: 'insurance_19CC04.pdf', inspection_expiry_doc: 'inspection_19CC04.pdf', approval_status: 'pending', documents_updated_at: null, created_at: movioDateFromToday(-4) },
        { vehicle_id: 3, user_id: 6, vehicle_type_id: 3, license_plate: '55-HJ-90', model: 'Peugeot Partner', max_weight_kg: 800, max_vol_m3: 3.3, insurance_expiry_date: movioDateFromToday(20), inspection_expiry_date: movioDateFromToday(300), insurance_expiry_doc: 'insurance_55HJ90.pdf', inspection_expiry_doc: 'inspection_55HJ90.pdf', approval_status: 'pending', documents_updated_at: movioDateFromToday(-1), created_at: movioDateFromToday(-6) },
        { vehicle_id: 4, user_id: 7, vehicle_type_id: 3, license_plate: '48-AB-22', model: 'Ford Transit', max_weight_kg: 1300, max_vol_m3: 11.0, insurance_expiry_date: movioDateFromToday(120), inspection_expiry_date: movioDateFromToday(-10), insurance_expiry_doc: 'insurance_48AB22.pdf', inspection_expiry_doc: 'inspection_48AB22.pdf', approval_status: 'approved', documents_updated_at: null, created_at: '2026-09-28' },
        { vehicle_id: 5, user_id: 6, vehicle_type_id: 4, license_plate: '33-TR-58', model: 'Mercedes Atego', max_weight_kg: 7500, max_vol_m3: 36.0, insurance_expiry_date: movioDateFromToday(240), inspection_expiry_date: movioDateFromToday(180), insurance_expiry_doc: 'insurance_33TR58.pdf', inspection_expiry_doc: 'inspection_33TR58.pdf', approval_status: 'approved', documents_updated_at: null, created_at: '2026-09-14' },
        { vehicle_id: 6, user_id: 8, vehicle_type_id: 3, license_plate: '34-KL-27', model: 'Citroen Berlingo', max_weight_kg: 750, max_vol_m3: 3.0, insurance_expiry_date: null, inspection_expiry_date: movioDateFromToday(60), insurance_expiry_doc: null, inspection_expiry_doc: 'inspection_34KL27.pdf', approval_status: 'rejected', documents_updated_at: null, created_at: '2026-09-27' }
    ],

    // VEHICLE_AUDIT entity: who decided on each vehicle, when and why.
    vehicleAudit: [
        { audit_id: 410, vehicle_id: 4, staff_user_id: 3, decision: 'approved', comment: 'Insurance and inspection documents are valid.', decided_at: '2026-10-01' },
        { audit_id: 405, vehicle_id: 6, staff_user_id: 2, decision: 'rejected', comment: 'Insurance certificate was missing.', decided_at: '2026-09-29' }
    ],

    // ROUTE entity: links a courier and a vehicle to one or more orders (used for Admin KPIs).
    routes: [
        { route_id: 1, user_id: 6, vehicle_id: 5, status: 'Completed', created_at: '2026-10-05' },
        { route_id: 2, user_id: 7, vehicle_id: 4, status: 'Completed', created_at: '2026-10-08' },
        { route_id: 3, user_id: 6, vehicle_id: 5, status: 'In Progress', created_at: movioDateFromToday(0) },
        { route_id: 4, user_id: 7, vehicle_id: 4, status: 'Initiated', created_at: movioDateFromToday(0) },
        { route_id: 5, user_id: 6, vehicle_id: 5, status: 'Cancelled', created_at: '2026-10-10' }
    ]
};