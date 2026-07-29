<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PrivateFileService
{
    public const DOCUMENT_MIMES = 'pdf,doc,docx,xls,xlsx,ppt,pptx,txt,csv,zip,rar,jpg,jpeg,png,gif';

    public function exists(string $path): bool
    {
        return Storage::disk('local')->exists($path)
            || Storage::disk('public')->exists($path);
    }

    public function path(string $path): ?string
    {
        foreach (['local', 'public'] as $disk) {
            if (Storage::disk($disk)->exists($path)) {
                return Storage::disk($disk)->path($path);
            }
        }

        return null;
    }

    public function download(string $path, string $fileName): StreamedResponse
    {
        $disk = $this->diskFor($path);

        return Storage::disk($disk)->download(
            $path,
            $this->safeFileName($fileName),
            $this->securityHeaders()
        );
    }

    public function inline(string $path, string $fileName): StreamedResponse
    {
        $disk = $this->diskFor($path);

        return Storage::disk($disk)->response(
            $path,
            $this->safeFileName($fileName),
            $this->securityHeaders(),
            'inline'
        );
    }

    public function delete(string $path): void
    {
        foreach (['local', 'public'] as $disk) {
            if (Storage::disk($disk)->exists($path)) {
                Storage::disk($disk)->delete($path);
            }
        }
    }

    public function copyToPrivate(string $source, string $destination): bool
    {
        if (Storage::disk('local')->exists($source)) {
            return Storage::disk('local')->copy($source, $destination);
        }

        if (! Storage::disk('public')->exists($source)) {
            return false;
        }

        return $this->copyStream('public', $source, 'local', $destination);
    }

    /**
     * Move one legacy public file to private storage.
     *
     * @return 'would_move'|'would_remove_duplicate'|'moved'|'removed_duplicate'|'private'|'missing'
     */
    public function migrateFromPublic(string $path, bool $dryRun = false): string
    {
        $publicExists = Storage::disk('public')->exists($path);
        $privateExists = Storage::disk('local')->exists($path);

        if (! $publicExists) {
            return $privateExists ? 'private' : 'missing';
        }

        if ($dryRun) {
            return $privateExists ? 'would_remove_duplicate' : 'would_move';
        }

        if (! $privateExists
            && ! $this->copyStream('public', $path, 'local', $path)) {
            throw new RuntimeException("Could not copy [{$path}] to private storage.");
        }

        if (! Storage::disk('public')->delete($path)) {
            throw new RuntimeException("Could not remove public copy of [{$path}].");
        }

        return $privateExists ? 'removed_duplicate' : 'moved';
    }

    public function downloadName(string $name, string $path): string
    {
        $extension = pathinfo($path, PATHINFO_EXTENSION);

        if ($extension === ''
            || strtolower(pathinfo($name, PATHINFO_EXTENSION)) === strtolower($extension)) {
            return $name;
        }

        return $name.'.'.$extension;
    }

    public function archiveName(string $name, string $path): string
    {
        return $this->safeFileName($this->downloadName($name, $path));
    }

    private function diskFor(string $path): string
    {
        if (Storage::disk('local')->exists($path)) {
            return 'local';
        }

        if (Storage::disk('public')->exists($path)) {
            return 'public';
        }

        abort(404, 'Файл табылмады.');
    }

    private function copyStream(
        string $sourceDisk,
        string $source,
        string $destinationDisk,
        string $destination
    ): bool {
        $stream = Storage::disk($sourceDisk)->readStream($source);

        if ($stream === false) {
            return false;
        }

        try {
            return Storage::disk($destinationDisk)
                ->writeStream($destination, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }
    }

    /**
     * @return array<string, string>
     */
    private function securityHeaders(): array
    {
        return [
            'Cache-Control' => 'private, no-store, max-age=0',
            'X-Content-Type-Options' => 'nosniff',
        ];
    }

    private function safeFileName(string $fileName): string
    {
        $fileName = str_replace('\\', '/', $fileName);
        $fileName = basename($fileName);
        $fileName = preg_replace('/[\x00-\x1F\x7F]/u', '', $fileName) ?? '';

        return ! in_array($fileName, ['', '.', '..'], true)
            ? $fileName
            : 'download';
    }
}
