<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\ResetPassword as BaseResetPassword;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPasswordNotification extends BaseResetPassword
{
    /**
     * Build the localized password reset message.
     */
    public function toMail($notifiable): MailMessage
    {
        $data = [
            'expiresIn' => (int) config(
                'auth.passwords.'.config('auth.defaults.passwords').'.expire',
                60
            ),
            'url' => $this->resetUrl($notifiable),
            'user' => $notifiable,
        ];

        return (new MailMessage)
            ->subject('IN-MAP · Құпиясөзді қалпына келтіру')
            ->view('emails.auth.reset-password', $data)
            ->text('emails.auth.reset-password-text', $data);
    }
}
