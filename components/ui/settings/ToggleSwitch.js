// components/ui/settings/ToggleSwitch.js
// Reusable toggle switch component

'use client';

export default function ToggleSwitch({ checked, onChange, disabled = false }) {
    return (
        <button
            type="button"
            onClick={onChange}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                checked ? 'bg-blue-600' : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={checked}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    checked ? 'translate-x-6' : 'translate-x-1'
                }`}
            />
        </button>
    );
}
