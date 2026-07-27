<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! DB::table('roles')->where('name', 'investor')->exists()) {
            DB::table('roles')->insert([
                'name' => 'investor',
                'display_name' => 'Инвестор',
                'description' => 'Өзіне бекітілген жобаларды көреді және сол жобалардағы тапсырмаларды орындайды',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        Schema::create('investment_project_investor', function (Blueprint $table) {
            $table->id();
            $table->foreignId('investment_project_id')
                ->constrained('investment_projects')
                ->cascadeOnDelete();
            $table->foreignId('user_id')
                ->constrained('users')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(
                ['investment_project_id', 'user_id'],
                'investment_project_investor_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('investment_project_investor');
        DB::table('roles')->where('name', 'investor')->delete();
    }
};
