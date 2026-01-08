<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KidsSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'setting_key',
        'setting_value',
        'setting_type',
        'description',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get a setting value by key
     */
    public static function get($key, $default = null)
    {
        $setting = self::where('setting_key', $key)->first();
        
        if (!$setting) {
            return $default;
        }

        // Handle JSON type
        if ($setting->setting_type === 'json') {
            return json_decode($setting->setting_value, true);
        }

        return $setting->setting_value;
    }

    /**
     * Set a setting value
     */
    public static function set($key, $value, $type = 'text', $description = null)
    {
        // Handle JSON type
        if ($type === 'json' && (is_array($value) || is_object($value))) {
            $value = json_encode($value);
        }

        return self::updateOrCreate(
            ['setting_key' => $key],
            [
                'setting_value' => $value,
                'setting_type' => $type,
                'description' => $description,
            ]
        );
    }
}
