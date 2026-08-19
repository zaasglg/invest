export type ZoneArea = {
    total: number;
    occupied: number;
    reserved: number;
    available: number;
};

export type PublicInfrastructureItem = {
    available: boolean;
    capacity: string | number | null;
    total: number;
    used: number;
    remaining: number;
};

export type PublicZonePhoto = {
    id: number;
    file_path: string;
    description?: string | null;
    gallery_date?: string | null;
    created_at?: string | null;
};

export type ApplicantZone = {
    id: number;
    type: 'sez' | 'industrial-zone' | 'prom-zone';
    type_label: string;
    name: string;
    status: string;
    description?: string | null;
    location?: { lat: number; lng: number }[] | null;
    main_gallery?: PublicZonePhoto[];
    render_photos?: PublicZonePhoto[];
    region?: { id: number; name: string; type?: string } | null;
    area: ZoneArea;
    infrastructure: Record<string, PublicInfrastructureItem>;
};

export type ApplicationDocument = {
    id: number;
    name: string;
    type?: string | null;
    size?: number | null;
    created_at: string;
};

export type ProjectTypeOption = {
    id: number;
    name: string;
};

export type StatusHistory = {
    id: number;
    from_status?: string | null;
    to_status: string;
    comment?: string | null;
    metadata?: Record<string, unknown> | null;
    created_at: string;
    actor?: { id: number; full_name: string } | null;
};

export type InvestmentApplication = {
    id: number;
    application_number: string;
    user_id: number;
    status: string;
    status_label: string;
    application_kind: 'new_project' | 'expansion';
    application_kind_label: string;
    source_investment_project_id?: number | null;
    zone_type: ApplicantZone['type'];
    zone_type_label: string;
    zoneable?: {
        id: number;
        name: string;
        region?: { id: number; name: string } | null;
    } | null;
    applicant?: {
        id: number;
        full_name: string;
        email: string;
        phone?: string | null;
    } | null;
    reviewer?: { id: number; full_name: string } | null;
    company_region?: { id: number; name: string } | null;
    investment_project?: { id: number; name: string } | null;
    source_investment_project?: { id: number; name: string } | null;
    project_name: string;
    project_description: string;
    activity_sector: string;
    project_types?: ProjectTypeOption[];
    requested_area: string | number;
    approved_area?: string | number | null;
    investment_amount: string | number;
    jobs_count: number;
    infrastructure_requirements?: Record<string, string | number | null>;
    company_legal_form: string;
    company_name: string;
    company_bin: string;
    company_registration_date: string;
    company_region_id: number;
    director_full_name: string;
    contact_person?: string | null;
    contact_phone: string;
    contact_email: string;
    legal_address: string;
    reviewer_comment?: string | null;
    submitted_at?: string | null;
    reviewed_at?: string | null;
    reserved_until?: string | null;
    converted_at?: string | null;
    created_at: string;
    updated_at: string;
    is_editable: boolean;
    is_withdrawable: boolean;
    documents?: ApplicationDocument[];
    status_histories?: StatusHistory[];
};
