<?php

namespace App\Services;

use App\Models\InvestmentApplication;
use App\Models\InvestmentApplicationDocument;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

class InvestmentApplicationDocumentService
{
    public function __construct(
        private readonly PrivateFileService $files
    ) {}

    /** @param array<int, UploadedFile> $documents */
    public function storeMany(
        InvestmentApplication $application,
        array $documents,
        User $uploader
    ): void {
        $storedPaths = [];

        try {
            foreach ($documents as $document) {
                $path = $document->store(
                    'investment-applications/'.$application->id,
                    'local'
                );

                if (! is_string($path)) {
                    throw new RuntimeException('Өтінім құжатын сақтау мүмкін болмады.');
                }

                $storedPaths[] = $path;
                InvestmentApplicationDocument::create([
                    'investment_application_id' => $application->id,
                    'name' => $this->safeOriginalName($document),
                    'file_path' => $path,
                    'type' => strtolower($document->getClientOriginalExtension()),
                    'size' => $document->getSize() ?: null,
                    'uploaded_by' => $uploader->id,
                ]);
            }
        } catch (Throwable $exception) {
            foreach ($storedPaths as $path) {
                $this->files->delete($path);
            }

            throw $exception;
        }
    }

    public function delete(InvestmentApplicationDocument $document): void
    {
        $path = $document->file_path;
        $document->delete();
        $this->files->delete($path);
    }

    private function safeOriginalName(UploadedFile $document): string
    {
        $name = str_replace('\\', '/', $document->getClientOriginalName());
        $name = basename($name);
        $name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name) ?? '';

        return Str::limit($name !== '' ? $name : 'document', 255, '');
    }
}
