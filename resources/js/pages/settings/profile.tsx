import { Transition } from '@headlessui/react';
import { Form, Head, router, usePage } from '@inertiajs/react';
import {
    Camera,
    CheckCircle2,
    ImagePlus,
    Save,
    Send,
    Trash2,
    UserRound,
} from 'lucide-react';
import { useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import AvatarCropper from '@/components/avatar-cropper';
import InputError from '@/components/input-error';
import TelegramIdHelpDialog from '@/components/telegram-id-help-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInitials } from '@/hooks/use-initials';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/profile';
import type { BreadcrumbItem, SharedData } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Профиль параметрлері',
        href: edit().url,
    },
];

type ProfileProps = {
    telegramBotUrl?: string | null;
};

export default function Profile({ telegramBotUrl }: ProfileProps) {
    const { auth } = usePage<SharedData>().props;
    const getInitials = useInitials();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [cropperOpen, setCropperOpen] = useState(false);
    const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

    const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setRawImageSrc(reader.result as string);
            setCropperOpen(true);
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    };

    const handleCropComplete = (croppedBlob: Blob) => {
        setCropperOpen(false);
        setRawImageSrc(null);

        const previewUrl = URL.createObjectURL(croppedBlob);
        setAvatarPreview(previewUrl);
        setIsUploadingAvatar(true);

        const formData = new FormData();
        formData.append('avatar', croppedBlob, 'avatar.jpg');

        router.post(ProfileController.updateAvatar.url(), formData, {
            forceFormData: true,
            onSuccess: () => {
                setAvatarPreview(null);
                setIsUploadingAvatar(false);
                URL.revokeObjectURL(previewUrl);
            },
            onError: () => {
                setAvatarPreview(null);
                setIsUploadingAvatar(false);
                URL.revokeObjectURL(previewUrl);
            },
        });
    };

    const handleCropperClose = () => {
        setCropperOpen(false);
        setRawImageSrc(null);
    };

    const handleDeleteAvatar = () => {
        if (!auth.user.avatar) {
            return;
        }

        if (!confirm('Профиль суретін өшіргіңіз келетініне сенімдісіз бе?')) {
            return;
        }

        router.delete(ProfileController.deleteAvatar.url(), {
            onSuccess: () => setAvatarPreview(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Профиль параметрлері" />

            <SettingsLayout>
                <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_35px_-28px_rgba(15,27,61,0.7)]">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
                        <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-navy/5 text-navy">
                                <ImagePlus className="size-5" />
                            </span>
                            <div>
                                <h2 className="font-bold text-navy">
                                    Профиль фотосы
                                </h2>
                                <p className="mt-0.5 text-sm text-slate-500">
                                    Сайтта көрсетілетін фотосуретіңізді
                                    жаңартыңыз.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
                        <div className="group relative w-fit">
                            <Avatar className="size-24 rounded-2xl ring-4 ring-slate-100">
                                <AvatarImage
                                    src={
                                        avatarPreview ||
                                        auth.user.avatar_url ||
                                        undefined
                                    }
                                    alt={auth.user.full_name}
                                />
                                <AvatarFallback className="rounded-2xl bg-navy/10 text-xl font-bold text-navy">
                                    {getInitials(
                                        auth.user.full_name || auth.user.email,
                                    )}
                                </AvatarFallback>
                            </Avatar>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 flex items-center justify-center rounded-2xl bg-navy/60 text-white opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                                aria-label="Профиль фотосын өзгерту"
                            >
                                <Camera className="size-6" />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-800">
                                {auth.user.full_name}
                            </p>
                            <p className="mt-1 truncate text-sm text-slate-500">
                                {auth.user.email}
                            </p>
                            <p className="mt-2 text-xs text-slate-400">
                                JPG, PNG немесе WebP · максимум 2 МБ
                            </p>
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingAvatar}
                            >
                                <Camera className="size-4" />
                                {isUploadingAvatar
                                    ? 'Жүктелуде...'
                                    : 'Фото таңдау'}
                            </Button>
                            {auth.user.avatar && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={handleDeleteAvatar}
                                    className="text-red-500 hover:bg-red-50 hover:text-red-700"
                                    aria-label="Профиль фотосын жою"
                                >
                                    <Trash2 className="size-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_10px_35px_-28px_rgba(15,27,61,0.7)]">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-5">
                        <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-navy/5 text-navy">
                                <UserRound className="size-5" />
                            </span>
                            <div>
                                <h2 className="font-bold text-navy">
                                    Жеке мәліметтер
                                </h2>
                                <p className="mt-0.5 text-sm text-slate-500">
                                    Профиль мен Telegram байланысын осы жерден
                                    өзгертіңіз.
                                </p>
                            </div>
                        </div>
                    </div>

                    <Form
                        {...ProfileController.update.form()}
                        options={{ preserveScroll: true }}
                        className="space-y-6 p-6"
                    >
                        {({ processing, recentlySuccessful, errors }) => (
                            <>
                                <div className="grid gap-5 sm:grid-cols-2">
                                    <div className="grid gap-2">
                                        <Label htmlFor="full_name">
                                            Толық аты-жөні
                                        </Label>
                                        <Input
                                            id="full_name"
                                            defaultValue={auth.user.full_name}
                                            name="full_name"
                                            required
                                            autoComplete="name"
                                            placeholder="Толық аты-жөніңіз"
                                        />
                                        <InputError
                                            message={errors.full_name}
                                        />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="email">
                                            Электрондық пошта
                                        </Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            defaultValue={auth.user.email}
                                            name="email"
                                            required
                                            autoComplete="username"
                                            placeholder="name@example.com"
                                        />
                                        <InputError message={errors.email} />
                                    </div>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="telegram_chat_id">
                                        Telegram ID
                                    </Label>
                                    <div className="flex items-center gap-2">
                                        <div className="relative min-w-0 flex-1">
                                            <Send className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-sky-500" />
                                            <Input
                                                id="telegram_chat_id"
                                                name="telegram_chat_id"
                                                defaultValue={
                                                    auth.user
                                                        .telegram_chat_id ?? ''
                                                }
                                                inputMode="numeric"
                                                autoComplete="off"
                                                placeholder="Мысалы: 123456789"
                                                className="pl-10"
                                            />
                                        </div>
                                        <TelegramIdHelpDialog
                                            botUrl={telegramBotUrl}
                                        />
                                    </div>
                                    <p className="text-xs leading-5 text-slate-400">
                                        Жеке хабарламаларды Telegram арқылы алу
                                        үшін сандық ID-іңізді енгізіңіз.
                                    </p>
                                    <InputError
                                        message={errors.telegram_chat_id}
                                    />
                                </div>

                                <div className="flex flex-wrap items-center gap-4 border-t border-slate-100 pt-5">
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        data-test="update-profile-button"
                                    >
                                        <Save className="size-4" />
                                        {processing
                                            ? 'Сақталуда...'
                                            : 'Өзгерістерді сақтау'}
                                    </Button>

                                    <Transition
                                        show={recentlySuccessful}
                                        enter="transition ease-in-out"
                                        enterFrom="translate-y-1 opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="translate-y-1 opacity-0"
                                    >
                                        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                                            <CheckCircle2 className="size-4" />
                                            Өзгерістер сақталды
                                        </p>
                                    </Transition>
                                </div>
                            </>
                        )}
                    </Form>
                </section>

                {rawImageSrc && (
                    <AvatarCropper
                        open={cropperOpen}
                        imageSrc={rawImageSrc}
                        onClose={handleCropperClose}
                        onCropComplete={handleCropComplete}
                    />
                )}
            </SettingsLayout>
        </AppLayout>
    );
}
