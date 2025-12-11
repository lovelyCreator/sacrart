# Sincronizar Traducciones de Support en VPS

## Problema
Las traducciones de `support.xx` funcionan en local pero no en el VPS porque no están sincronizadas en la base de datos del servidor.

## Solución

### Opción 1: Ejecutar el script de sincronización (Recomendado)

1. Sube el archivo `sync_support_translations.php` al VPS
2. Ejecuta el script desde la raíz del proyecto:

```bash
cd /ruta/al/proyecto
php sync_support_translations.php
```

### Opción 2: Usar el seeder de traducciones

Si tienes un seeder que sincroniza todas las traducciones:

```bash
php artisan db:seed --class=TranslationSeeder
```

### Opción 3: Sincronizar manualmente desde el admin panel

1. Accede al panel de administración
2. Ve a la sección de traducciones
3. Exporta/Importa las traducciones de `support`

## Verificación

Después de sincronizar, verifica que las traducciones estén en la base de datos:

```bash
php artisan tinker
```

Luego ejecuta:
```php
$en = App\Models\Translation::where('locale', 'en')->where('key', 'like', 'support.%')->count();
$es = App\Models\Translation::where('locale', 'es')->where('key', 'like', 'support.%')->count();
$pt = App\Models\Translation::where('locale', 'pt')->where('key', 'like', 'support.%')->count();
echo "EN: $en, ES: $es, PT: $pt\n";
```

Deberías ver aproximadamente 75 traducciones por idioma.

## Nota

Este es el mismo proceso que se usó para sincronizar `plans.xx` → `subscription.xx`. Las traducciones de `support.xx` deben estar en la base de datos para que funcionen correctamente en el VPS.

