export default function ConfigMissing() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-4 p-6">
      <div className="text-5xl">🔑</div>
      <h1 className="font-display text-2xl font-semibold">Нужно подключить Supabase</h1>
      <p className="text-ink/70">
        Откройте файл <b>.env</b> в папке проекта и вставьте туда адрес и ключ из Supabase. Затем
        остановите приложение и запустите заново командой <b>npm run dev</b>.
      </p>
      <p className="text-sm text-ink/50">Подробные шаги есть в файле README.md.</p>
    </div>
  )
}
