<?php

namespace Modules\Cemiterios\Console;

use Illuminate\Console\Command;
use Modules\Cemiterios\Models\Concessionario;
use Modules\Cemiterios\Models\Empreiteiro;
use Modules\Cemiterios\Models\Falecido;
use Illuminate\Support\Facades\Log;
use Illuminate\Contracts\Encryption\DecryptException;

class FixEncryptedDataCommand extends Command
{
    protected $signature = 'cemiterios:fix-encrypted-data';
    protected $description = 'Reseta campos criptografados corrompidos para evitar DecryptException em massa';

    public function handle(): int
    {
        $this->info('Iniciando limpeza de dados criptografados corrompidos...');

        $this->fixModel(Concessionario::class, ['documento', 'email', 'telefone']);
        $this->fixModel(Empreiteiro::class, ['documento', 'contatos']);
        $this->fixModel(Falecido::class, ['causa_morte', 'docs_medicos']);

        $this->info('Limpeza concluída.');
        return self::SUCCESS;
    }

    /**
     * @param class-string $modelClass
     * @param array<string> $fields
     */
    private function fixModel(string $modelClass, array $fields): void
    {
        $this->info("Processando " . basename(str_replace('\\', '/', $modelClass)) . "...");
        
        $count = 0;
        // We use chunk to avoid memory issues
        $modelClass::chunk(100, function ($records) use ($fields, &$count) {
            foreach ($records as $record) {
                foreach ($fields as $field) {
                    try {
                        // Trigger decryption by accessing the attribute
                        $val = $record->{$field};
                        // If it didn't throw, it's fine.
                    } catch (DecryptException $e) {
                        $record->{$field} = null;
                        $record->save();
                        $count++;
                    }
                }
            }
        });
        $this->info("Corrigidos {$count} registros em " . basename(str_replace('\\', '/', $modelClass)));
    }
}
