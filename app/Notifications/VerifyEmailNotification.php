<?php

namespace App\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail as BaseVerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;

class VerifyEmailNotification extends BaseVerifyEmail
{
    /**
     * Build the localized email verification message.
     */
    public function toMail($notifiable): MailMessage
    {
        $data = [
            'expiresIn' => (int) config('auth.verification.expire', 60),
            'url' => $this->verificationUrl($notifiable),
            'user' => $notifiable,
        ];

        return (new MailMessage)
            ->subject('IN-MAP · Email мекенжайыңызды растаңыз')
            ->view('emails.auth.verify-email', $data)
            ->text('emails.auth.verify-email-text', $data);
    }
}
