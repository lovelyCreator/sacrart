<?php

return [
    'secret' => env('STRIPE_SECRET'),
    'key' => env('STRIPE_KEY'),
    'webhook_secret' => env('STRIPE_WEBHOOK_SECRET'),
    'currency' => env('STRIPE_CURRENCY', 'eur'),
    
    // Company/Billing Information
    'company' => [
        'name' => env('STRIPE_COMPANY_NAME', 'Ana Rey Martínez'),
        'tax_id' => env('STRIPE_TAX_ID', '75768495D'),
        'address' => [
            'line1' => env('STRIPE_ADDRESS_LINE1', 'Carretera del marquesado. Calle gaviota 1B'),
            'city' => env('STRIPE_ADDRESS_CITY', ''),
            'state' => env('STRIPE_ADDRESS_STATE', ''),
            'postal_code' => env('STRIPE_ADDRESS_POSTAL_CODE', ''),
            'country' => env('STRIPE_ADDRESS_COUNTRY', 'ES'), // Spain
        ],
        'phone' => env('STRIPE_COMPANY_PHONE', '+34639374077'),
        'email' => env('STRIPE_COMPANY_EMAIL', 'anarey@sacrart.com'),
        'contact_person' => env('STRIPE_CONTACT_PERSON', 'Ana Rey'),
    ],
    
    // Frontend should provide success/cancel URLs; these are fallbacks
    'success_url' => env('STRIPE_SUCCESS_URL', env('APP_URL') . '/payment/success'),
    'cancel_url' => env('STRIPE_CANCEL_URL', env('APP_URL') . '/payment/cancel'),
];


