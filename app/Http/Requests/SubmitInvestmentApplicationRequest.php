<?php

namespace App\Http\Requests;

use App\Models\InvestmentApplication;

class SubmitInvestmentApplicationRequest extends InvestmentApplicationRequest
{
    protected function prepareForValidation(): void
    {
        /** @var InvestmentApplication $application */
        $application = $this->route('investmentApplication');
        $application->loadMissing('projectTypes:id');

        $this->replace([
            'intent' => 'submit',
            'application_kind' => $application->application_kind,
            'source_investment_project_id' => $application->source_investment_project_id,
            'project_name' => $application->project_name,
            'project_description' => $application->project_description,
            'project_type_ids' => $application->projectTypes
                ->pluck('id')
                ->values()
                ->all(),
            'company_activity_type' => $application->company_activity_type,
            'requested_area' => $application->requested_area,
            'investment_amount' => $application->investment_amount,
            'jobs_count' => $application->jobs_count,
            'planned_start_year' => $application->planned_start_year,
            'planned_end_year' => $application->planned_end_year,
            'company_legal_form' => $application->company_legal_form,
            'company_name' => $application->company_name,
            'company_bin' => $application->company_bin,
            'company_registration_date' => $application
                ->company_registration_date?->format('Y-m-d'),
            'company_region_id' => $application->company_region_id,
            'director_full_name' => $application->director_full_name,
            'contact_person' => $application->contact_person,
            'contact_phone' => $application->contact_phone,
            'contact_email' => $application->contact_email,
            'legal_address' => $application->legal_address,
            'infrastructure_requirements' => $application
                ->infrastructure_requirements ?? [],
            'production_not_applicable' => $application
                ->production_not_applicable,
            'planned_production' => $application->planned_production ?? [],
        ]);
    }
}
