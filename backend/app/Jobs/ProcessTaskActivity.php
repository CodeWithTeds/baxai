<?php

namespace App\Jobs;

use App\Events\TaskActivityLogged;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessTaskActivity implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct() {}

    /**
     * Execute the job.
     */
    public function handle(TaskActivityLogged $event): void
    {
        $task = $event->task;
        $action = $event->action;

        ProcessTaskActivity::dispatch($task, $action);
        $task->user->notify(new TaskActivityLogged($task, $action));
    }
}
