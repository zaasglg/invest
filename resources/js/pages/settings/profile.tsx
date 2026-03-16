import { Transition } from '@headlessui/react';
import { Form, Head, Link, router, usePage } from '@inertiajs/react';
import { Camera, Trash2 } from 'lucide-react';
import React, { useRef, useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import AvatarCropper from '@/components/avatar-cropper';
import DeleteUser from '@/components/delete-user';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useInitials } from '@/hooks/use-initials';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { BreadcrumbItem, SharedData } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Профиль баптаулары',
        href: edit().url,
    },
];

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<SharedData>().props;
    const getInitials = useInitials();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [cropperOpen, setCropperOpen] = useState(false);
    const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Read file and open cropper
        const reader = new FileReader();
        reader.onload = () => {
            setRawImageSrc(reader.result as string);
            setCropperOpen(true);
        };
        reader.readAsDataURL(file);

        // Reset input so same file can be selected again
        e.target.value = '';
    };

    const handleCropComplete = (croppedBlob: Blob) => {
        setCropperOpen(false);
        setRawImageSrc(null);

        // Show preview
        const previewUrl = URL.createObjectURL(croppedBlob);
        setAvatarPreview(previewUrl);

        // Upload cropped image
        setIsUploadingAvatar(true);
        const formData = new FormData();
        formData.append('avatar', croppedBlob, 'avatar.jpg');

        router.post('/settings/profile/avatar', formData, {
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
        if (!auth.user.avatar) return;
        router.delete('/settings/profile/avatar', {
            onSuccess: () => setAvatarPreview(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Профиль баптаулары" />

            <h1 className="sr-only">Профиль баптаулары</h1>

            <SettingsLayout>
                {/* Avatar Section */}
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <Heading
                        variant="small"
                        title="Профиль фотосы"
                        description="Фотосуретіңізді жүктеңіз. Ол сайт тақырыбында және жоба беттерінде көрсетіледі."
                    />

                    <div className="mt-4 flex items-center gap-6">
                        <div className="group relative">
                            <Avatar className="h-20 w-20 rounded-full ring-2 ring-gray-100">
                                <AvatarImage
                                    src={
                                        avatarPreview ||
                                        (auth.user.avatar_url as string)
                                    }
                                    alt={auth.user.full_name}
                                />
                                <AvatarFallback className="rounded-full bg-[#0f1b3d]/10 text-lg font-semibold text-[#0f1b3d]">
                                    {getInitials(
                                        auth.user.full_name ||
                                            auth.user.email,
                                    )}
                                </AvatarFallback>
                            </Avatar>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                            >
                                <Camera className="h-6 w-6 text-white" />
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleAvatarChange}
                                className="hidden"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploadingAvatar}
                                className="border-gray-200 shadow-none hover:bg-gray-50"
                            >
                                {isUploadingAvatar
                                    ? 'Жүктелуде...'
                                    : 'Фото жүктеу'}
                            </Button>
                            {auth.user.avatar && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleDeleteAvatar}
                                    className="text-red-500 hover:bg-red-50 hover:text-red-700"
                                >
                                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                                    Жою
                                </Button>
                            )}
                        </div>
                    </div>
                    <p className="mt-3 text-xs text-gray-400">
                        JPG, PNG немесе WebP. Максимум 2 МБ.
                    </p>
                </div>

                {/* Profile info section */}
                <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                    <Heading
                        variant="small"
                        title="Жеке мәліметтер"
                        description="Атыңызды және электрондық поштаңызды жаңартыңыз"
                    />

                    <Form
                        {...ProfileController.update.form()}
                        options={{
                            preserveScroll: true,
                        }}
                        className="mt-4 space-y-5"
                    >
                        {({ processing, recentlySuccessful, errors }) => (
                            <>
                                <div className="grid gap-1.5">
                                    <Label htmlFor="full_name">Аты</Label>
                                    <Input
                                        id="full_name"
                                        className="block w-full"
                                        defaultValue={
                                            auth.user.full_name
                                        }
                                        name="full_name"
                                        required
                                        autoComplete="name"
                                        placeholder="Толық атыңыз"
                                    />
                                    <InputError
                                        className="mt-1"
                                        message={errors.full_name}
                                    />
                                </div>

                                <div className="grid gap-1.5">
                                    <Label htmlFor="email">
                                        Электрондық пошта
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        className="block w-full"
                                        defaultValue={auth.user.email}
                                        name="email"
                                        required
                                        autoComplete="username"
                                        placeholder="Электрондық пошта мекенжайы"
                                    />
                                    <InputError
                                        className="mt-1"
                                        message={errors.email}
                                    />
                                </div>

                                {mustVerifyEmail &&
                                    auth.user.email_verified_at === null && (
                                        <div className="rounded-lg border border-amber-100 bg-amber-50 p-3">
                                            <p className="text-sm text-amber-700">
                                                Электрондық пошта
                                                мекенжайыңыз расталмаған.{' '}
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="font-medium text-amber-800 underline underline-offset-4 transition-colors hover:text-amber-900"
                                                >
                                                    Растау хатын
                                                    жіберу үшін басыңыз.
                                                </Link>
                                            </p>

                                            {status ===
                                                'verification-link-sent' && (
                                                <div className="mt-2 text-sm font-medium text-green-600">
                                                    Растау сілтемесі
                                                    поштаңызға жіберілді.
                                                </div>
                                            )}
                                        </div>
                                    )}

                                <div className="flex items-center gap-4">
                                    <Button
                                        disabled={processing}
                                        data-test="update-profile-button"
                                        className="bg-[#0f1b3d] text-white shadow-none hover:bg-[#1a2d5a]"
                                    >
                                        Сақтау
                                    </Button>

                                    <Transition
                                        show={recentlySuccessful}
                                        enter="transition ease-in-out"
                                        enterFrom="opacity-0"
                                        leave="transition ease-in-out"
                                        leaveTo="opacity-0"
                                    >
                                        <p className="text-sm text-green-600">
                                            Сақталды
                                        </p>
                                    </Transition>
                                </div>
                            </>
                        )}
                    </Form>
                </div>

                <DeleteUser />

                {/* Avatar Cropper Modal */}
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
