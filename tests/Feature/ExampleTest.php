<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_home_redirects_to_the_login_page()
    {
        $response = $this->get(route('home'));

        $response->assertRedirect(route('login', absolute: false));
    }

    public function test_the_previous_home_page_is_available_as_a_test_page()
    {
        $response = $this->get(route('test'));

        $response->assertOk();
    }
}
