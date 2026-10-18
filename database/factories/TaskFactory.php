<?php

namespace Database\Factories;

use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Models\Task;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(4),
            'description' => fake()->optional()->paragraph(),
            'status' => TaskStatus::Pending,
            'priority' => TaskPriority::Medium,
            'due_date' => Task::businessToday(),
            'created_by_id' => User::factory(),
        ];
    }

    public function assignedTo(User $user): static
    {
        return $this->state(fn (): array => ['assigned_to_id' => $user->id]);
    }

    public function createdBy(User $user): static
    {
        return $this->state(fn (): array => ['created_by_id' => $user->id]);
    }

    public function dueOn(?string $date): static
    {
        return $this->state(fn (): array => ['due_date' => $date]);
    }

    public function completed(): static
    {
        return $this->state(fn (): array => ['status' => TaskStatus::Completed, 'completed_at' => now()]);
    }
}
