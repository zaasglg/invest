<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Validation Language Lines
    |--------------------------------------------------------------------------
    |
    | The following language lines contain the default error messages used by
    | the validator class. Some of these rules have multiple versions such
    | as the size rules. Feel free to tweak each of these messages here.
    |
    */

    'accepted' => ':attribute өрісі қабылдануы тиіс.',
    'accepted_if' => ':other :value болған кезде :attribute өрісі қабылдануы тиіс.',
    'active_url' => ':attribute өрісі жарамды URL болуы тиіс.',
    'after' => ':attribute өрісі :date күнінен кейінгі күн болуы тиіс.',
    'after_or_equal' => ':attribute өрісі :date күнінен кейінгі немесе соған тең күн болуы тиіс.',
    'alpha' => ':attribute өрісінде тек әріптер болуы тиіс.',
    'alpha_dash' => ':attribute өрісінде тек әріптер, сандар, сызықшалар және асты сызу белгілері болуы тиіс.',
    'alpha_num' => ':attribute өрісінде тек әріптер мен сандар болуы тиіс.',
    'any_of' => ':attribute өрісі жарамсыз.',
    'array' => ':attribute өрісі массив болуы тиіс.',
    'ascii' => ':attribute өрісінде тек бірбайттық әріптік-сандық таңбалар мен символдар болуы тиіс.',
    'before' => ':attribute өрісі :date күнінен бұрынғы күн болуы тиіс.',
    'before_or_equal' => ':attribute өрісі :date күнінен бұрынғы немесе соған тең күн болуы тиіс.',
    'between' => [
        'array' => ':attribute өрісіндегі элементтер саны :min мен :max аралығында болуы тиіс.',
        'file' => ':attribute файлының көлемі :min пен :max килобайт аралығында болуы тиіс.',
        'numeric' => ':attribute мәні :min мен :max аралығында болуы тиіс.',
        'string' => ':attribute жолының ұзындығы :min мен :max таңба аралығында болуы тиіс.',
    ],
    'boolean' => ':attribute өрісі true немесе false болуы тиіс.',
    'can' => ':attribute өрісінде рұқсат етілмеген мән бар.',
    'confirmed' => ':attribute растауы сәйкес емес.',
    'contains' => ':attribute өрісінде қажет мән жетіспейді.',
    'current_password' => 'Құпиясөз қате.',
    'date' => ':attribute өрісі жарамды күн болуы тиіс.',
    'date_equals' => ':attribute өрісі :date күніне тең күн болуы тиіс.',
    'date_format' => ':attribute өрісі :format пішіміне сәйкес болуы тиіс.',
    'decimal' => ':attribute өрісінде :decimal ондық бөлшек болуы тиіс.',
    'declined' => ':attribute өрісі қабылданбауы тиіс.',
    'declined_if' => ':other :value болған кезде :attribute өрісі қабылданбауы тиіс.',
    'different' => ':attribute және :other әртүрлі болуы тиіс.',
    'digits' => ':attribute өрісі :digits саннан тұруы тиіс.',
    'digits_between' => ':attribute өрісі :min бен :max сан аралығында болуы тиіс.',
    'dimensions' => ':attribute өрісіндегі сурет өлшемдері жарамсыз.',
    'distinct' => ':attribute өрісінде қайталанатын мән бар.',
    'doesnt_contain' => ':attribute өрісінде келесі мәндердің ешқайсысы болмауы тиіс: :values.',
    'doesnt_end_with' => ':attribute өрісі келесі мәндердің бірімен аяқталмауы тиіс: :values.',
    'doesnt_start_with' => ':attribute өрісі келесі мәндердің бірінен басталмауы тиіс: :values.',
    'email' => ':attribute өрісі жарамды электрондық пошта мекенжайы болуы тиіс.',
    'encoding' => ':attribute өрісі :encoding кодтауында болуы тиіс.',
    'ends_with' => ':attribute өрісі келесі мәндердің бірімен аяқталуы тиіс: :values.',
    'enum' => 'Таңдалған :attribute жарамсыз.',
    'exists' => 'Таңдалған :attribute жарамсыз.',
    'extensions' => ':attribute өрісінің кеңейтулері келесілердің бірі болуы тиіс: :values.',
    'file' => ':attribute өрісі файл болуы тиіс.',
    'filled' => ':attribute өрісінде мән болуы тиіс.',
    'gt' => [
        'array' => ':attribute өрісінде :value элементтен көп болуы тиіс.',
        'file' => ':attribute файлының көлемі :value килобайттан үлкен болуы тиіс.',
        'numeric' => ':attribute мәні :value мәнінен үлкен болуы тиіс.',
        'string' => ':attribute жолының ұзындығы :value таңбадан көп болуы тиіс.',
    ],
    'gte' => [
        'array' => ':attribute өрісінде кемінде :value элемент болуы тиіс.',
        'file' => ':attribute файлының көлемі :value килобайттан үлкен немесе тең болуы тиіс.',
        'numeric' => ':attribute мәні :value мәнінен үлкен немесе тең болуы тиіс.',
        'string' => ':attribute жолының ұзындығы :value таңбадан көп немесе тең болуы тиіс.',
    ],
    'hex_color' => ':attribute өрісі жарамды оналтылық түсті мән болуы тиіс.',
    'image' => ':attribute өрісі сурет болуы тиіс.',
    'in' => 'Таңдалған :attribute жарамсыз.',
    'in_array' => ':attribute өрісі :other ішінде болуы тиіс.',
    'in_array_keys' => ':attribute өрісінде келесі кілттердің кем дегенде біреуі болуы тиіс: :values.',
    'integer' => ':attribute өрісі бүтін сан болуы тиіс.',
    'ip' => ':attribute өрісі жарамды IP мекенжайы болуы тиіс.',
    'ipv4' => ':attribute өрісі жарамды IPv4 мекенжайы болуы тиіс.',
    'ipv6' => ':attribute өрісі жарамды IPv6 мекенжайы болуы тиіс.',
    'json' => ':attribute өрісі жарамды JSON жолы болуы тиіс.',
    'list' => ':attribute өрісі тізім болуы тиіс.',
    'lowercase' => ':attribute өрісі кіші әріптермен жазылуы тиіс.',
    'lt' => [
        'array' => ':attribute өрісінде :value элементтен аз болуы тиіс.',
        'file' => ':attribute файлының көлемі :value килобайттан аз болуы тиіс.',
        'numeric' => ':attribute мәні :value мәнінен аз болуы тиіс.',
        'string' => ':attribute жолының ұзындығы :value таңбадан аз болуы тиіс.',
    ],
    'lte' => [
        'array' => ':attribute өрісінде :value элементтен көп болмауы тиіс.',
        'file' => ':attribute файлының көлемі :value килобайттан аз немесе тең болуы тиіс.',
        'numeric' => ':attribute мәні :value мәнінен аз немесе тең болуы тиіс.',
        'string' => ':attribute жолының ұзындығы :value таңбадан аз немесе тең болуы тиіс.',
    ],
    'mac_address' => ':attribute өрісі жарамды MAC мекенжайы болуы тиіс.',
    'max' => [
        'array' => ':attribute өрісінде :max элементтен көп болмауы тиіс.',
        'file' => ':attribute файлының көлемі :max килобайттан үлкен болмауы тиіс.',
        'numeric' => ':attribute мәні :max мәнінен үлкен болмауы тиіс.',
        'string' => ':attribute жолының ұзындығы :max таңбадан аспауы тиіс.',
    ],
    'max_digits' => ':attribute өрісіндегі сандар саны :max саннан аспауы тиіс.',
    'mimes' => ':attribute келесі түрдегі файл болуы тиіс: :values.',
    'mimetypes' => ':attribute келесі түрдегі файл болуы тиіс: :values.',
    'min' => [
        'array' => ':attribute өрісінде кемінде :min элемент болуы тиіс.',
        'file' => ':attribute файлының көлемі кемінде :min килобайт болуы тиіс.',
        'numeric' => ':attribute мәні кемінде :min болуы тиіс.',
        'string' => ':attribute жолының ұзындығы кемінде :min таңба болуы тиіс.',
    ],
    'min_digits' => ':attribute өрісінде кемінде :min сан болуы тиіс.',
    'missing' => ':attribute өрісі болмауы тиіс.',
    'missing_if' => ':other :value болған кезде :attribute өрісі болмауы тиіс.',
    'missing_unless' => ':other :value болмаса, :attribute өрісі болмауы тиіс.',
    'missing_with' => ':values бар болған кезде :attribute өрісі болмауы тиіс.',
    'missing_with_all' => ':values бар болған кезде :attribute өрісі болмауы тиіс.',
    'multiple_of' => ':attribute мәні :value еселік болуы тиіс.',
    'not_in' => 'Таңдалған :attribute жарамсыз.',
    'not_regex' => ':attribute өрісінің пішімі жарамсыз.',
    'numeric' => ':attribute өрісі сан болуы тиіс.',
    'password' => [
        'letters' => ':attribute өрісінде кемінде бір әріп болуы тиіс.',
        'mixed' => ':attribute өрісінде кемінде бір бас және бір кіші әріп болуы тиіс.',
        'numbers' => ':attribute өрісінде кемінде бір сан болуы тиіс.',
        'symbols' => ':attribute өрісінде кемінде бір арнайы символ болуы тиіс.',
        'uncompromised' => 'Көрсетілген :attribute деректердің ағып кетуінде кездескен. Басқа :attribute таңдаңыз.',
    ],
    'present' => ':attribute өрісі болуы тиіс.',
    'present_if' => ':other :value болған кезде :attribute өрісі болуы тиіс.',
    'present_unless' => ':other :value болмаса, :attribute өрісі болуы тиіс.',
    'present_with' => ':values бар болған кезде :attribute өрісі болуы тиіс.',
    'present_with_all' => ':values бар болған кезде :attribute өрісі болуы тиіс.',
    'prohibited' => ':attribute өрісін қолдануға тыйым салынады.',
    'prohibited_if' => ':other :value болған кезде :attribute өрісін қолдануға тыйым салынады.',
    'prohibited_if_accepted' => ':other қабылданған кезде :attribute өрісін қолдануға тыйым салынады.',
    'prohibited_if_declined' => ':other қабылданбаған кезде :attribute өрісін қолдануға тыйым салынады.',
    'prohibited_unless' => ':other :values ішінде болмаса, :attribute өрісін қолдануға тыйым салынады.',
    'prohibits' => ':attribute өрісі :other өрісінің болуына тыйым салады.',
    'regex' => ':attribute өрісінің пішімі жарамсыз.',
    'required' => ':attribute өрісін толтыру міндетті.',
    'required_array_keys' => ':attribute өрісінде келесі кілттерге мәндер болуы тиіс: :values.',
    'required_if' => ':other :value болған кезде :attribute өрісін толтыру міндетті.',
    'required_if_accepted' => ':other қабылданған кезде :attribute өрісін толтыру міндетті.',
    'required_if_declined' => ':other қабылданбаған кезде :attribute өрісін толтыру міндетті.',
    'required_unless' => ':other :values ішінде болмаса, :attribute өрісін толтыру міндетті.',
    'required_with' => ':values бар болған кезде :attribute өрісін толтыру міндетті.',
    'required_with_all' => ':values бар болған кезде :attribute өрісін толтыру міндетті.',
    'required_without' => ':values жоқ болған кезде :attribute өрісін толтыру міндетті.',
    'required_without_all' => ':values мәндерінің ешқайсысы болмаған кезде :attribute өрісін толтыру міндетті.',
    'same' => ':attribute және :other бірдей болуы тиіс.',
    'size' => [
        'array' => ':attribute өрісінде дәл :size элемент болуы тиіс.',
        'file' => ':attribute файлының көлемі :size килобайт болуы тиіс.',
        'numeric' => ':attribute мәні :size болуы тиіс.',
        'string' => ':attribute жолының ұзындығы :size таңба болуы тиіс.',
    ],
    'starts_with' => ':attribute өрісі келесі мәндердің бірінен басталуы тиіс: :values.',
    'string' => ':attribute өрісі жол болуы тиіс.',
    'timezone' => ':attribute өрісі жарамды уақыт белдеуі болуы тиіс.',
    'unique' => ':attribute бұрыннан тіркелген.',
    'uploaded' => ':attribute жүктелмеді.',
    'uppercase' => ':attribute өрісі бас әріптермен жазылуы тиіс.',
    'url' => ':attribute өрісі жарамды URL болуы тиіс.',
    'ulid' => ':attribute өрісі жарамды ULID болуы тиіс.',
    'uuid' => ':attribute өрісі жарамды UUID болуы тиіс.',

    /*
    |--------------------------------------------------------------------------
    | Custom Validation Language Lines
    |--------------------------------------------------------------------------
    |
    | Here you may specify custom validation messages for attributes using the
    | convention "attribute.rule" to name the lines. This makes it quick to
    | specify a specific custom language line for a given attribute rule.
    |
    */

    'custom' => [
        'attribute-name' => [
            'rule-name' => 'custom-message',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Custom Validation Attributes
    |--------------------------------------------------------------------------
    |
    | The following language lines are used to swap our attribute placeholder
    | with something more reader friendly such as "E-Mail Address" instead
    | of "email". This simply helps us make our message more expressive.
    |
    */

    'attributes' => [
        'mineral_type' => 'Минерал түрі', // Инпуттың аты => Қазақша баламасы
        'bin' => 'БИН/Кадастрлық нөмір',
        'name' => 'Аты-жөні',
        'region_id' => 'Аймақ',
        'total_area' => 'Жалпы алаңы',
        'description' => 'Сипаттамасы',
        'license_status' => 'Лицензия статусы',
        'license_start' => 'Лицензияның басталу күні',
        'license_end' => 'Лицензияның аяқталу күні',
        'project_type_id' => 'Жоба түрі',
        'total_investment' => 'Жалпы инвестиция',
        'full_name' => 'Толық аты-жөні',
        'email' => 'Электрондық пошта',
        'phone' => 'Телефон',
        'password' => 'Құпиясөз',
        'role_id' => 'Рөл',
    ],

];
