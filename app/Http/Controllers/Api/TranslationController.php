<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\GoogleTranslateService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

class TranslationController extends Controller
{
    protected GoogleTranslateService $translateService;

    public function __construct(GoogleTranslateService $translateService)
    {
        $this->translateService = $translateService;
    }

    /**
     * Translate a single text to multiple languages
     */
    public function translate(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'text' => 'required|string',
            'source_language' => 'nullable|string|in:en,es,pt',
            'target_languages' => 'nullable|array',
            'target_languages.*' => 'string|in:en,es,pt',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $text = $request->input('text');
            $sourceLanguage = $request->input('source_language', 'en');
            $targetLanguages = $request->input('target_languages', ['es', 'pt']);

            // Remove source language from target languages if present
            $targetLanguages = array_filter($targetLanguages, function($lang) use ($sourceLanguage) {
                return $lang !== $sourceLanguage;
            });

            if (empty($targetLanguages)) {
                return response()->json([
                    'success' => true,
                    'data' => [$sourceLanguage => $text],
                ]);
            }

            $translations = $this->translateService->translateToMultiple($text, array_values($targetLanguages), $sourceLanguage);

            // Include source language in response
            $translations[$sourceLanguage] = $text;

            return response()->json([
                'success' => true,
                'data' => $translations,
            ]);
        } catch (\Exception $e) {
            Log::error('Translation API error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Translation failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Translate multiple fields at once
     */
    public function translateFields(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'fields' => 'required|array',
            'fields.*' => 'string',
            'source_language' => 'nullable|string|in:en,es,pt',
            'target_languages' => 'nullable|array',
            'target_languages.*' => 'string|in:en,es,pt',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        try {
            $fields = $request->input('fields');
            $sourceLanguage = $request->input('source_language', 'en');
            $targetLanguages = $request->input('target_languages', ['es', 'pt']);

            // Remove source language from target languages if present
            $targetLanguages = array_filter($targetLanguages, function($lang) use ($sourceLanguage) {
                return $lang !== $sourceLanguage;
            });

            Log::info('TranslationController: Starting translation', [
                'source_language' => $sourceLanguage,
                'target_languages' => $targetLanguages,
                'fields' => array_keys($fields),
            ]);

            $result = $this->translateService->translateFields($fields, array_values($targetLanguages), $sourceLanguage);

            Log::info('TranslationController: Translation service result', [
                'result' => $result,
            ]);

            // Include source language for each field
            foreach ($fields as $fieldName => $fieldValue) {
                if (!isset($result[$fieldName])) {
                    $result[$fieldName] = [];
                }
                $result[$fieldName][$sourceLanguage] = $fieldValue;
            }

            Log::info('TranslationController: Final result with source language', [
                'final_result' => $result,
            ]);

            // Check if translations actually happened (not just returning source text)
            $translationFailed = false;
            $failedFields = [];
            foreach ($fields as $fieldName => $fieldValue) {
                if (isset($result[$fieldName])) {
                    foreach ($result[$fieldName] as $lang => $translatedValue) {
                        if ($lang !== $sourceLanguage && $translatedValue === $fieldValue) {
                            $translationFailed = true;
                            $failedFields[] = "{$fieldName}.{$lang}";
                        }
                    }
                }
            }

            if ($translationFailed) {
                Log::warning('TranslationController: Some translations returned same as source', [
                    'failed_fields' => $failedFields,
                    'source_language' => $sourceLanguage,
                    'target_languages' => $targetLanguages,
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $result,
                'warnings' => $translationFailed ? [
                    'message' => 'Some translations may have failed. Check Laravel logs for details.',
                    'failed_fields' => $failedFields,
                ] : null,
            ]);
        } catch (\Exception $e) {
            Log::error('Translation fields API error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Translation failed: ' . $e->getMessage(),
            ], 500);
        }
    }
}
