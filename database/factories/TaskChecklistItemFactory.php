<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\TaskChecklistItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<TaskChecklistItem>
 */
class TaskChecklistItemFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'task_id' => Task::factory(),
            'body' => fake()->sentence(3),
            'is_completed' => false,
            'position' => 0,
        ];
    }

    public function completed(): static
    {
        return $this->state(fn (): array => ['is_completed' => true, 'completed_at' => now()]);
    }
}
