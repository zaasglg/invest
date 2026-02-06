<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('investment_project_subsoil_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_project_id')->constrained()->onDelete('cascade');
            $table->foreignId('subsoil_user_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            $table->unique(['investment_project_id', 'subsoil_user_id'], 'ip_su_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investment_project_subsoil_user');
    }
};
