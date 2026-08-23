<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Events\OutboxMessage;
use App\Models\OutboxEvent;
use App\Support\OutboxPublisher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

final class OutboxProcessingTest extends TestCase
{
    use RefreshDatabase;

    public function test_event_is_marked_done_when_no_listener_throws(): void
    {
        app(OutboxPublisher::class)->publish('finance.revenue.created', ['revenue_id' => 1]);

        $this->artisan('outbox:process')->assertSuccessful();

        $event = OutboxEvent::query()->sole();
        self::assertSame('done', $event->status);
        self::assertSame(1, $event->attempts);
        self::assertNotNull($event->processed_at);
    }

    public function test_failing_listener_schedules_retry_with_error(): void
    {
        Event::listen(OutboxMessage::class, fn () => throw new \RuntimeException('listener quebrado'));

        app(OutboxPublisher::class)->publish('finance.expense.created', ['expense_id' => 1]);
        $this->artisan('outbox:process')->assertSuccessful();

        $event = OutboxEvent::query()->sole();
        self::assertSame('pending', $event->status);
        self::assertSame(1, $event->attempts);
        self::assertSame('listener quebrado', $event->error);
    }

    public function test_already_processed_events_are_not_reprocessed(): void
    {
        OutboxEvent::create(['event_type' => 'tenant.created', 'event_version' => 1, 'payload' => [], 'status' => 'done', 'available_at' => now()]);

        $this->artisan('outbox:process')->assertSuccessful();

        self::assertSame(0, OutboxEvent::query()->where('status', 'processing')->count());
        self::assertSame('done', OutboxEvent::query()->sole()->status);
    }
}
