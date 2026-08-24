@extends('emails.auth.layout')

@section('title', 'Құпиясөзді қалпына келтіру')
@section('preheader', 'IN-MAP аккаунтыңызға жаңа құпиясөз орнатыңыз.')

@section('content')
    <div style="margin-bottom: 16px; color: #67e8f9; font-size: 11px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;">
        Аккаунт қауіпсіздігі
    </div>

    <h1 class="email-title" style="margin: 0; color: #ffffff; font-size: 30px; line-height: 1.25; letter-spacing: -0.025em;">
        Құпиясөзді қалпына келтіру
    </h1>

    <p style="margin: 24px 0 0; color: #cbd5e1; font-size: 16px; line-height: 26px;">
        Сәлеметсіз бе, {{ $user->full_name ?: 'пайдаланушы' }}!
    </p>

    <p style="margin: 12px 0 0; color: #94a3b8; font-size: 15px; line-height: 25px;">
        IN-MAP аккаунтыңыздың құпиясөзін қалпына келтіру туралы сұрау алдық. Жаңа құпиясөз орнату үшін төмендегі батырманы басыңыз.
    </p>

    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
        <tr>
            <td style="background-color: #67e8f9;">
                <a href="{{ $url }}" style="display: inline-block; padding: 15px 24px; color: #082f49; font-size: 14px; font-weight: 800; text-decoration: none;">
                    Жаңа құпиясөз орнату&nbsp;&nbsp;→
                </a>
            </td>
        </tr>
    </table>

    <div style="border-left: 2px solid #22d3ee; background-color: #07101a; padding: 14px 16px; color: #94a3b8; font-size: 13px; line-height: 21px;">
        Қауіпсіздік үшін бұл сілтеме {{ $expiresIn }} минуттан кейін жарамсыз болады.
    </div>

    <p style="margin: 24px 0 0; color: #64748b; font-size: 12px; line-height: 20px;">
        Батырма ашылмаса, мына сілтемені браузерге көшіріңіз:<br>
        <a href="{{ $url }}" style="color: #67e8f9; word-break: break-all;">{{ $url }}</a>
    </p>

    <p style="margin: 24px 0 0; color: #64748b; font-size: 12px; line-height: 20px;">
        Егер құпиясөзді қалпына келтіруді сіз сұратпаған болсаңыз, аккаунтыңызға өзгеріс енгізілмейді — бұл хатты елемей-ақ қойыңыз.
    </p>
@endsection
