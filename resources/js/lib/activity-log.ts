import { ATTRACTION_ACTIVITY_STATUSES } from '@/lib/attraction-activity';
import { PROJECT_INFRASTRUCTURE_FIELDS } from '@/lib/infrastructure';
import { ATTRACTION_STAGES } from '@/lib/project-attraction';

interface ActivityContext {
    event?: string | null;
    category?: string | null;
    subject_type?: string | null;
}

const FIELD_LABELS: Record<string, string> = {
    id: 'Нөмірі',
    name: 'Атауы',
    title: 'Тақырыбы',
    company_name: 'Компания',
    description: 'Сипаттама',
    current_status: 'Ағымдағы жағдай',
    status: 'Мәртебе',
    category: 'Санаты',
    severity: 'Маңыздылық',
    region: 'Өңір',
    region_id: 'Өңір нөмірі',
    bin: 'БСН',
    mineral_type: 'Пайдалы қазба түрі',
    total_area: 'Жалпы аумақ',
    license_status: 'Лицензия күйі',
    license_start: 'Лицензияның басталу күні',
    license_end: 'Лицензияның аяқталу күні',
    jobs_count: 'Жұмыс орындары',
    total_investment: 'Инвестиция сомасы',
    investment_amount_type: 'Инвестиция сомасының нақтылығы',
    project_types: 'Жоба түрлері',
    start_date: 'Басталу күні',
    end_date: 'Аяқталу күні',
    due_date: 'Аяқталу мерзімі',
    sort_order: 'Тізімдегі орны',
    assigned_to: 'Жауапты пайдаланушы нөмірі',
    approval_status: 'Модерация мәртебесі',
    decision: 'Шешім',
    source: 'Дереккөзі',
    type: 'Түрі',
    photo_type: 'Фото түрі',
    file_type: 'Файл түрі',
    gallery_date: 'Галерея күні',
    file_name: 'Файл атауы',
    original_name: 'Бастапқы файл атауы',
    curators: 'Кураторлар',
    executors: 'Орындаушылар',
    sezs: 'АЭА',
    industrial_zones: 'Индустриялық аймақтар',
    prom_zones: 'Өндірістік аймақтар',
    attraction_stage: 'Инвестор тарту кезеңі',
    attraction_handover_to_id: 'Сүйемелдеуге қабылдаушы',
    attraction_handover_accepted_at: 'Сүйемелдеуге қабылданған уақыты',
    attraction_decline_reason: 'Бас тарту себебі',
    attraction_resume_on: 'Қайта байланысу күні',
    event_name: 'Іс-шара атауы',
    event_date: 'Іс-шара күні',
    result: 'Нәтиже',
    next_action: 'Келесі әрекет',
    next_action_due_date: 'Келесі әрекеттің мерзімі',
    responsible_id: 'Жауапты пайдаланушы нөмірі',
    created_by: 'Қосқан пайдаланушы нөмірі',
    report_result: 'Орындалу нәтижесі',
    reported_at: 'Есеп берілген уақыт',
    reported_by: 'Есеп берген пайдаланушы нөмірі',
    reviewed_at: 'Тексерілген уақыт',
    reviewed_by: 'Тексерген пайдаланушы нөмірі',
    reviewer_comment: 'Тексерушінің түсіндірмесі',
    infrastructure: 'Инфрақұрылым',
    available: 'Қолжетімді',
    needed: 'Қажеттілік',
    capacity: 'Қуаттылық',
    required_capacity: 'Қажетті қуаттылық',
    used_capacity: 'Пайдаланудағы қуаттылық',
    distance: 'Қашықтық',
    location: 'Орналасуы',
    lat: 'Ендік',
    lng: 'Бойлық',
    geometry: 'Картадағы аумақ',
    coordinates: 'Координаттар',
    features: 'Карта нысандары',
    properties: 'Қасиеттері',
    planned_production: 'Жоспарлы өндіріс',
    product_name: 'Өнім атауы',
    planned_quantity: 'Жоспарлы көлем',
    unit: 'Өлшем бірлігі',
    planned_amount: 'Жоспарлы сома',
    period: 'Кезеңі',
    legacy_value: 'Бұрынғы мәні',
    ...Object.fromEntries(
        PROJECT_INFRASTRUCTURE_FIELDS.map(({ key, label }) => [key, label]),
    ),
};

// Older records use Kazakh labels as detail keys instead of field names.
const FIELD_ALIASES: Record<string, string> = {
    жоба_статусы: 'status',
    жоба_мәртебесі: 'status',
    статус: 'status',
    мәртебе: 'status',
    күйі: 'status',
    лицензия_күйі: 'license_status',
    маңыздылық: 'severity',
    модерация_статусы: 'approval_status',
    модерация_мәртебесі: 'approval_status',
    шешім: 'decision',
    фото_түрі: 'photo_type',
    файл_түрі: 'file_type',
    түрі: 'type',
    дереккөзі: 'source',
    кезең: 'attraction_stage',
    инвестор_тарту_кезеңі: 'attraction_stage',
    инвестиция_сомасының_нақтылығы: 'investment_amount_type',
    инфрақұрылым: 'infrastructure',
    орналасуы: 'location',
    картадағы_аумақ: 'geometry',
    карта_геометриясы: 'geometry',
    жоспарлы_өндіріс: 'planned_production',
};

const STATUS_LABELS: Record<string, string> = {
    plan: 'Жоспарланған',
    implementation: 'Іске асыру',
    launched: 'Іске қосылған',
    suspended: 'Тоқтатылған',
    active: 'Белсенді',
    developing: 'Дамушы',
    new: 'Жаңа',
    in_progress: 'Орындалуда',
    done: 'Орындалды',
    open: 'Ашық',
    resolved: 'Шешілді',
    pending: 'Тексеруде',
    approved: 'Қабылданды',
    rejected: 'Қабылданбады',
    ...Object.fromEntries(
        ATTRACTION_ACTIVITY_STATUSES.map(({ value, label }) => [value, label]),
    ),
};

const VALUE_LABELS: Record<string, Record<string, string>> = {
    status: STATUS_LABELS,
    approval_status: {
        pending: 'Растауды күтуде',
        approved: 'Қабылданды',
        rejected: 'Қабылданбады',
    },
    decision: STATUS_LABELS,
    license_status: {
        active: 'Белсенді',
        expired: 'Мерзімі өткен',
        suspended: 'Тоқтатылған',
        illegal: 'Заңсыз',
    },
    severity: {
        low: 'Төмен',
        medium: 'Орташа',
        high: 'Жоғары',
        critical: 'Сыни жағдай',
    },
    investment_amount_type: {
        exact: 'Нақты сома',
        estimated: 'Болжамды сома',
        unknown: 'Белгісіз',
    },
    attraction_stage: Object.fromEntries(
        ATTRACTION_STAGES.map(({ value, label }) => [value, label]),
    ),
    photo_type: { gallery: 'Галерея', render: 'Жобалық көрініс' },
    file_type: { photo: 'Фотосурет', document: 'Құжат' },
    type: {
        photo: 'Фотосурет',
        document: 'Құжат',
        gallery: 'Галерея',
        render: 'Жобалық көрініс',
        Point: 'Нүкте',
        MultiPoint: 'Нүктелер',
        LineString: 'Сызық',
        MultiLineString: 'Сызықтар',
        Polygon: 'Көпбұрыш',
        MultiPolygon: 'Көпбұрыштар',
        Feature: 'Карта нысаны',
        FeatureCollection: 'Карта нысандарының жиынтығы',
        GeometryCollection: 'Геометриялар жиынтығы',
    },
    source: {
        manual: 'Қолмен жүктелген',
        task_completion: 'Тапсырма нәтижесі',
    },
};

const EVENT_LABELS: Record<string, string> = {
    legacy: 'Бұрынғы әрекет',
    'entity.created': 'Нысан құрылды',
    'entity.updated': 'Нысан жаңартылды',
    'entity.deleted': 'Нысан өшірілді',
    'entity.restored': 'Нысан қалпына келтірілді',
    'project.created': 'Жоба құрылды',
    'project.updated': 'Жоба жаңартылды',
    'project.position_changed': 'Жобаның тізімдегі орны өзгертілді',
    'project.status_updated': 'Жобаның ағымдағы жағдайы жаңартылды',
    'project.status_update_added': 'Жобаның ағымдағы жағдайы толықтырылды',
    'project.deleted': 'Жоба өшірілді',
    'project.restored': 'Жоба қалпына келтірілді',
    'project.archived': 'Жоба мұрағатқа жіберілді',
    'project.unarchived': 'Жоба мұрағаттан шығарылды',
    'project.created_from_application': 'Өтінімнен жоба құрылды',
    'project.expanded_from_application': 'Жоба өтінімнен толықтырылды',
    'project.attached': 'Жоба нысанға байланыстырылды',
    'project.detached': 'Жоба нысаннан ажыратылды',
    'production.fact.saved': 'Нақты өндіріс деректері сақталды',
    'attraction.created': 'Инвестор тарту іс-шарасы қосылды',
    'attraction.updated': 'Инвестор тарту іс-шарасы жаңартылды',
    'attraction.deleted': 'Инвестор тарту іс-шарасы өшірілді',
    'attraction.started': 'Инвестор тарту іс-шарасы басталды',
    'attraction.report_submitted': 'Іс-шараның орындалу есебі жіберілді',
    'attraction.report_approved': 'Іс-шараның орындалу есебі расталды',
    'attraction.report_rejected': 'Іс-шараның орындалу есебі қабылданбады',
    'attraction.handover_accepted': 'Жоба сүйемелдеуге қабылданды',
    'task.created': 'Тапсырма құрылды',
    'task.updated': 'Тапсырма жаңартылды',
    'task.deleted': 'Тапсырма өшірілді',
    'task.resubmitted': 'Тапсырма қайта растауға жіберілді',
    'task.approved': 'Тапсырма расталды',
    'task.rejected': 'Тапсырма қабылданбады',
    'task.viewed': 'Орындаушы тапсырманы көрді',
    'completion.submitted': 'Тапсырманың орындалу нәтижесі жіберілді',
    'completion.approved': 'Тапсырманың орындалу нәтижесі қабылданды',
    'completion.rejected': 'Тапсырманың орындалу нәтижесі қабылданбады',
    'completion.file_previewed': 'Тапсырма нәтижесінің файлы қаралды',
    'completion.file_downloaded': 'Тапсырма нәтижесінің файлы жүктелді',
    'issue.created': 'Проблемалық мәселе қосылды',
    'issue.updated': 'Проблемалық мәселе жаңартылды',
    'issue.deleted': 'Проблемалық мәселе өшірілді',
    'document.uploaded': 'Құжат жүктеп салынды',
    'document.downloaded': 'Құжат жүктеп алынды',
    'document.deleted': 'Құжат өшірілді',
    'document.archived': 'Құжат мұрағатқа жіберілді',
    'photo.uploaded': 'Фото жүктеп салынды',
    'photo.updated': 'Фото жаңартылды',
    'photo.deleted': 'Фото өшірілді',
    'chat.message_sent': 'Чатқа хабарлама жіберілді',
    'download.document': 'Құжат жүктеп алынды',
    'download.photo': 'Фото жүктеп алынды',
    'download.chat_attachment': 'Чаттағы тіркеме жүктелді',
    'download.completion_file': 'Тапсырма нәтижесінің файлы жүктелді',
    'download.project_archive': 'Жобаның құжаттар мұрағаты жүктелді',
    'download.presentation': 'Жоба презентациясы жүктелді',
    'download.bulk_presentation': 'Жобалардың топтық презентациясы жүктелді',
    'passport.downloaded': 'Нысан төлқұжаты жүктелді',
};

const SUBJECT_LABELS: Record<string, string> = {
    InvestmentProject: 'Инвестициялық жоба',
    InvestmentApplication: 'Инвестициялық өтінім',
    ProjectAttractionActivity: 'Инвестор тарту іс-шарасы',
    ProjectTask: 'Жол картасының тапсырмасы',
    SubsoilTask: 'Жер қойнауын пайдаланушының тапсырмасы',
    TaskCompletion: 'Тапсырманың орындалу нәтижесі',
    SubsoilTaskCompletion: 'Тапсырманың орындалу нәтижесі',
    TaskCompletionFile: 'Тапсырма нәтижесінің файлы',
    SubsoilTaskCompletionFile: 'Тапсырма нәтижесінің файлы',
    ProjectChatMessage: 'Чат хабарламасы',
    ProjectChatAttachment: 'Чат тіркемесі',
    ProjectProductionFact: 'Нақты өндіріс деректері',
    Sez: 'Арнайы экономикалық аймақ',
    IndustrialZone: 'Индустриялық аймақ',
    PromZone: 'Өндірістік аймақ',
    SubsoilUser: 'Жер қойнауын пайдаланушы',
};

const ROLE_LABELS: Record<string, string> = {
    superadmin: 'Бас әкімші',
    invest: 'Инвестиция штабы',
    akim: 'Әкім',
    zamakim: 'Әкімнің орынбасары',
    ispolnitel: 'Орындаушы',
    moderator: 'Модератор',
    applicant: 'Өтінім беруші',
    prokuror: 'Прокурор',
    investor: 'Инвестор',
    'супер админ': 'Бас әкімші',
    'invest штаб': 'Инвестиция штабы',
    аким: 'Әкім',
    'зам аким': 'Әкімнің орынбасары',
    исполнитель: 'Орындаушы',
};

function lookupLabel(
    labels: Record<string, string>,
    value: string,
): string | undefined {
    return Object.hasOwn(labels, value) ? labels[value] : undefined;
}

function fieldKey(field: string): string {
    const key = field
        .trim()
        .toLowerCase()
        .replace(/[\s-]+/g, '_');
    return lookupLabel(FIELD_ALIASES, key) ?? key;
}

export function activityFieldLabel(field: string, label?: string): string {
    // Keep the more specific Kazakh labels already stored by the backend.
    const existingLabel = label ?? field;
    if (/[А-Яа-яӘәҒғҚқҢңӨөҰұҮүҺһІі]/u.test(existingLabel)) {
        return existingLabel;
    }
    return lookupLabel(FIELD_LABELS, fieldKey(field)) ?? label ?? field;
}

export function activityEventLabel(event: string): string {
    return lookupLabel(EVENT_LABELS, event) ?? event;
}

export function activitySubjectLabel(subject: string): string {
    const name = subject.split('\\').pop() ?? subject;
    const label = lookupLabel(SUBJECT_LABELS, name);
    if (label) return label;
    if (
        /^(Project|Sez|IndustrialZone|PromZone|Subsoil)(Photo|Issue|Document)$/.test(
            name,
        )
    ) {
        if (name.endsWith('Photo')) return 'Фотосурет';
        if (name.endsWith('Issue')) return 'Проблемалық мәселе';
        return 'Құжат';
    }
    return subject;
}

export function activityRoleLabel(role: string, displayName?: string): string {
    return lookupLabel(ROLE_LABELS, role.toLowerCase()) ?? displayName ?? role;
}

export function formatActivityValue(
    value: unknown,
    field: string,
    context: ActivityContext = {},
): string {
    if (value === null || value === undefined || value === '') {
        return 'Көрсетілмеген';
    }
    if (typeof value === 'boolean') return value ? 'Иә' : 'Жоқ';

    const key = fieldKey(field);
    if (Array.isArray(value)) {
        return value.length > 0
            ? value
                  .map((item) => {
                      const formatted = formatActivityValue(item, key, context);
                      return Array.isArray(item) ? `[${formatted}]` : formatted;
                  })
                  .join(', ')
            : 'Бос';
    }
    if (typeof value === 'object') {
        const entries = Object.entries(value);
        return entries.length > 0
            ? entries
                  .map(
                      ([name, item]) =>
                          `${activityFieldLabel(name)}: ${formatActivityValue(item, name, context)}`,
                  )
                  .join('; ')
            : 'Бос';
    }
    if (typeof value === 'string') {
        // Change snapshots encode these structures as JSON. Free text stays intact.
        if (
            [
                'infrastructure',
                'geometry',
                'location',
                'planned_production',
                'curators',
                'executors',
                'project_types',
                'sezs',
                'industrial_zones',
                'prom_zones',
            ].includes(key) &&
            (value.trim().startsWith('[') || value.trim().startsWith('{'))
        ) {
            try {
                return formatActivityValue(JSON.parse(value), key, context);
            } catch {
                // Historical snapshots can be truncated; retain their original data.
            }
        }
        if (
            key === 'status' &&
            (context.category === 'attraction' ||
                context.event?.startsWith('attraction.') ||
                context.subject_type === 'ProjectAttractionActivity')
        ) {
            return (
                ATTRACTION_ACTIVITY_STATUSES.find(
                    (item) => item.value === value,
                )?.label ??
                lookupLabel(STATUS_LABELS, value) ??
                value
            );
        }
        const labels = Object.hasOwn(VALUE_LABELS, key)
            ? VALUE_LABELS[key]
            : undefined;
        return labels ? (lookupLabel(labels, value) ?? value) : value;
    }
    return String(value);
}
