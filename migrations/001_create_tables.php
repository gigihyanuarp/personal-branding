<?php

use Illuminate\Database\Capsule\Manager as Capsule;
use Illuminate\Database\Schema\Blueprint;

return function () {
    // Portfolios table
    Capsule::schema()->create('portfolios', function (Blueprint $table) {
        $table->id();
        $table->string('title');
        $table->string('slug')->unique();
        $table->text('description');
        $table->text('short_description')->nullable();
        $table->string('image')->nullable();
        $table->json('technologies')->nullable();
        $table->string('project_url')->nullable();
        $table->string('github_url')->nullable();
        $table->boolean('is_featured')->default(false);
        $table->enum('status', ['draft', 'published'])->default('draft');
        $table->integer('order')->default(0);
        $table->timestamps();
        $table->softDeletes();
        $table->index(['status', 'is_featured']);
        $table->index('order');
    });

    // Contacts table
    Capsule::schema()->create('contacts', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('email');
        $table->string('subject');
        $table->text('message');
        $table->boolean('is_read')->default(false);
        $table->string('ip_address')->nullable();
        $table->text('user_agent')->nullable();
        $table->timestamps();
        $table->index(['is_read', 'created_at']);
    });

    // Users table
    Capsule::schema()->create('users', function (Blueprint $table) {
        $table->id();
        $table->string('email')->unique();
        $table->string('password');
        $table->string('name');
        $table->timestamp('last_login_at')->nullable();
        $table->timestamps();
    });
};