<!doctype html>
<html lang="kk">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <title>@yield('title')</title>
    <style>
        @media only screen and (max-width: 620px) {
            .email-shell { padding: 20px 12px !important; }
            .email-card { padding: 28px 22px !important; }
            .email-title { font-size: 25px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #04090f; color: #e2e8f0; font-family: Arial, Helvetica, sans-serif;">
    <div style="display: none; max-height: 0; overflow: hidden; opacity: 0; color: transparent;">
        @yield('preheader')
    </div>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; background-color: #04090f;">
        <tr>
            <td class="email-shell" align="center" style="padding: 44px 16px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; max-width: 600px;">
                    <tr>
                        <td style="padding: 0 0 20px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td width="42" height="42" align="center" style="width: 42px; height: 42px; border: 1px solid rgba(103, 232, 249, 0.45); background-color: #0a121d; color: #67e8f9; font-size: 13px; font-weight: 800; letter-spacing: 0.08em;">
                                        IN
                                    </td>
                                    <td style="padding-left: 13px;">
                                        <div style="color: #ffffff; font-size: 17px; font-weight: 800; letter-spacing: 0.02em;">IN-MAP</div>
                                        <div style="padding-top: 3px; color: #64748b; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;">Инвестициялық платформа</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    <tr>
                        <td class="email-card" style="border: 1px solid #1e293b; background-color: #0a121d; padding: 42px 44px; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);">
                            @yield('content')
                        </td>
                    </tr>
                    <tr>
                        <td align="center" style="padding: 24px 16px 0; color: #475569; font-size: 12px; line-height: 20px;">
                            Бұл — IN-MAP жүйесі автоматты түрде жіберген хабарлама.<br>
                            Осы хатқа жауап берудің қажеті жоқ.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
