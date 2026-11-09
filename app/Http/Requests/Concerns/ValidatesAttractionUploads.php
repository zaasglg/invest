<?php

namespace App\Http\Requests\Concerns;

use App\Services\CompletionWorkflowService;

trait ValidatesAttractionUploads
{
    private function uploadRules(bool $enabled): array
    {
        if (! $enabled) {
            return ['documents' => ['exclude'], 'photos' => ['exclude']];
        }

        return [
            'documents' => ['required', 'array', 'min:1', 'max:10'],
            'documents.*' => ['required', 'file', 'max:20480', 'mimes:'.CompletionWorkflowService::PROJECT_DOCUMENT_MIMES],
            'photos' => ['nullable', 'array', 'max:10'],
            'photos.*' => ['image', 'max:20480'],
        ];
    }

    public function messages(): array
    {
        return [
            'documents.required' => 'Іс-шараның орындалуын растайтын кемінде бір құжат жүктеңіз.',
            'documents.min' => 'Іс-шараның орындалуын растайтын кемінде бір құжат жүктеңіз.',
            'documents.*.mimes' => 'Құжат PDF, Word, Excel, PowerPoint, TXT, CSV, ZIP немесе RAR форматында болуы керек. Суретті «Суреттер» бөліміне жүктеңіз.',
        ];
    }
}
