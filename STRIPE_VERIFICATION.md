# Verificación de Integración de Stripe

## ✅ Pasos para Finalizar la Integración

### 1. Agregar el Webhook Secret al archivo .env

Abre tu archivo `.env` y agrega o actualiza la siguiente línea:

```env
STRIPE_WEBHOOK_SECRET=whsec_MHPYEX7vdrQuRjYwTK5OTidQvbzUfIar
```

### 2. Limpiar la caché de configuración

Ejecuta el siguiente comando:

```bash
php artisan config:clear
```

### 3. Verificar el Estado de Stripe

#### Opción A: Usando el Script de Verificación

```bash
php check_stripe_setup.php
```

Este script verificará:
- ✅ Variables de entorno configuradas
- ✅ Conexión con Stripe
- ✅ Configuración del webhook
- ✅ Planes de suscripción y sus Stripe Price IDs

#### Opción B: Usando el Endpoint de API

Puedes verificar el estado desde el panel de administración o haciendo una petición:

**Desde el navegador (si estás autenticado como admin):**
```
GET /api/payments/stripe/status
```

**Desde la línea de comandos:**
```bash
curl -X GET http://72.61.297.64:8000/api/payments/stripe/status \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

#### Opción C: Usando Tinker

```bash
php artisan tinker
```

```php
// Verificar configuración de Stripe
echo "Currency: " . config('stripe.currency') . "\n";
echo "Secret Key: " . (config('stripe.secret') ? 'SET ✓' : 'NOT SET ✗') . "\n";
echo "Publishable Key: " . (config('stripe.key') ? 'SET ✓' : 'NOT SET ✗') . "\n";
echo "Webhook Secret: " . (config('stripe.webhook_secret') ? 'SET ✓' : 'NOT SET ✗') . "\n";

// Verificar planes
$plans = App\Models\SubscriptionPlan::where('is_active', true)->get();
foreach ($plans as $plan) {
    $status = $plan->stripe_price_id ? '✓' : '✗';
    echo "{$status} {$plan->name}: €{$plan->price}/month - Stripe Price ID: " . ($plan->stripe_price_id ?: 'NOT SET') . "\n";
}
```

## 📋 Checklist de Integración Completa

- [x] **Stripe Keys configuradas** (STRIPE_KEY y STRIPE_SECRET en .env)
- [x] **Webhook creado en Stripe Dashboard**
- [x] **Webhook Secret agregado** (STRIPE_WEBHOOK_SECRET en .env)
- [x] **Moneda configurada** (EUR)
- [ ] **Productos creados en Stripe Dashboard** (para cada plan)
- [ ] **Stripe Price IDs agregados** a los planes en el panel de administración
- [ ] **Webhook URL configurada** en Stripe Dashboard: `https://TU_DOMINIO/api/payments/stripe/webhook`

## 🔗 URL del Webhook

La URL exacta que debes usar en Stripe Dashboard es:

```
https://TU_DOMINIO/api/payments/stripe/webhook
```

O si estás usando el servidor actual:
```
http://72.61.297.64:8000/api/payments/stripe/webhook
```

## 📝 Próximos Pasos

1. **Crear Productos y Precios en Stripe Dashboard:**
   - Ve a [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
   - Crea un producto para cada plan (Basic, Premium)
   - Crea un precio mensual en EUR para cada producto
   - Copia el Price ID (empieza con `price_`)

2. **Agregar Stripe Price IDs a los Planes:**
   - Ve al panel de administración → Subscription Plans
   - Edita cada plan y agrega el Stripe Price ID correspondiente

3. **Probar el Flujo de Pago:**
   - Crea una cuenta de prueba
   - Selecciona un plan de pago
   - Usa la tarjeta de prueba: `4242 4242 4242 4242`
   - Verifica que el webhook recibe los eventos correctamente

## ✅ Estado Actual

Con el Webhook Secret que proporcionaste (`whsec_MHPYEX7vdrQuRjYwTK5OTidQvbzUfIar`), la integración está **casi completa**. Solo falta:

1. Agregar el secret al archivo `.env`
2. Crear los productos/precios en Stripe Dashboard
3. Agregar los Stripe Price IDs a los planes en el panel de administración

Una vez completados estos pasos, la integración estará **100% funcional**.



