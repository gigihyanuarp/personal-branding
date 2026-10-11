<?php

use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Database\Schema\Blueprint;

return function () {
    // Visitor logs table
    Capsule::schema()->create('visitor_logs', function (Blueprint $table) {
        $table->id();
        $table->string('ip_address')->nullable();
        $table->string('user_agent')->nullable();
        $table->string('referred_from')->nullable(); // dari halaman apa datang
        $table->string('landing_page')->nullable(); // halaman pertama dikunjungi
        $table->string('visited_page')->nullable(); // halaman terakhir dikunjungi
        $table->string('country')->nullable(); // dari user agent parsing (sederhana)
        $table->string('city')->nullable(); // dari user agent parsing (sederhana)
        $table->boolean('is_robot')->default(false);
        $table->timestamp('visited_at')->useCurrent();
        $table->index(['visited_at']);
        $table->index(['ip_address']);
    });
};