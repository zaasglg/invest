<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CompanyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $contacts = (bool) $request->attributes->get('api_client')?->include_contacts;
        $internal = (bool) $request->attributes->get('api_client')?->include_internal;

        return [
            'id' => $this->id,
            'legal_form' => $this->legal_form,
            'legal_form_label' => $this->legal_form_label,
            'name' => $this->name,
            'display_name' => $this->display_name,
            'bin' => $this->bin,
            'registration_date' => $this->registration_date?->toDateString(),
            'region' => $this->whenLoaded('region', fn () => $this->region
                ? [
                    'id' => $this->region->id,
                    'name' => $this->region->name,
                ]
                : null),
            'activity_type' => $this->activity_type,
            'director_full_name' => $this->when($contacts, $this->director_full_name),
            'contact_person' => $this->when($contacts, $this->contact_person),
            'phone' => $this->when($contacts, $this->phone),
            'website' => $this->website,
            'legal_address' => $this->when($contacts, $this->legal_address),
            'actual_address' => $this->when($contacts, $this->actual_address),
            'licenses_and_regulatory_documents' => $this->when($internal, $this->licenses_and_regulatory_documents),
            'status' => $this->status,
            'status_label' => $this->status_label,
            'notes' => $this->when($internal, $this->notes),
            'is_profile_complete' => $this->is_profile_complete,
            'projects_count' => (int) ($this->projects_count ?? 0),
            'investor' => $this->whenLoaded('investor', fn () => $this->investor
                ? [
                    'id' => $this->investor->id,
                    'full_name' => $this->investor->full_name,
                    'phone' => $this->when($contacts, $this->investor->phone),
                ]
                : null),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
