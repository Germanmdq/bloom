"use client";

import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";

const AREA_CODES = [
    { code: "223", city: "Mar del Plata" },
    { code: "11",  city: "Buenos Aires" },
    { code: "221", city: "La Plata" },
    { code: "351", city: "Córdoba" },
    { code: "341", city: "Rosario" },
    { code: "261", city: "Mendoza" },
    { code: "381", city: "Tucumán" },
    { code: "291", city: "Bahía Blanca" },
    { code: "299", city: "Neuquén" },
    { code: "387", city: "Salta" },
    { code: "342", city: "Santa Fe" },
    { code: "376", city: "Posadas" },
    { code: "264", city: "San Juan" },
    { code: "280", city: "Chubut" },
];

interface PhoneInputProps {
    value: string;
    onChange: (value: string) => void;
    inputClass?: string;
    error?: boolean;
}

export function PhoneInput({ value, onChange, inputClass = "", error = false }: PhoneInputProps) {
    const [open, setOpen] = useState(false);

    // Split value into area code and local number on mount/change
    const matchedArea = AREA_CODES
        .slice()
        .sort((a, b) => b.code.length - a.code.length)
        .find(a => value.replace(/\D/g, "").startsWith(a.code));

    const areaCode   = matchedArea?.code ?? "223";
    const localPart  = value.replace(/\D/g, "").slice(areaCode.length);

    const setArea = (code: string) => {
        onChange(code + localPart);
        setOpen(false);
    };

    const setLocal = (raw: string) => {
        onChange(areaCode + raw.replace(/\D/g, ""));
    };

    const baseInput = `w-full min-h-[52px] rounded-2xl border-2 bg-white px-4 text-[16px] font-semibold outline-none placeholder:font-medium placeholder:text-neutral-400 transition-all ${
        error ? "border-red-300 bg-red-50" : "border-neutral-200 focus:border-[#c9a84c] focus:ring-2 focus:ring-[#c9a84c]/25"
    } ${inputClass}`;

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                {/* Area code button */}
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    className={`flex items-center gap-1 min-h-[52px] px-4 rounded-2xl border-2 font-black text-[16px] whitespace-nowrap transition-all ${
                        error ? "border-red-300 bg-red-50" : "border-neutral-200 bg-white hover:border-[#c9a84c]"
                    }`}
                >
                    {areaCode}
                    <IconChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                </button>

                {/* Local number */}
                <input
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-local"
                    placeholder="000-0000"
                    value={localPart}
                    onChange={e => setLocal(e.target.value)}
                    className={baseInput}
                />
            </div>

            <p className="text-[12px] font-medium text-neutral-400 ml-1">
                Sin el 15 · Ej: <span className="font-bold">{areaCode} 555-1234</span>
            </p>

            {/* Area code picker */}
            {open && (
                <div className="grid grid-cols-2 gap-1.5 p-3 rounded-2xl border border-neutral-100 bg-white shadow-lg">
                    {AREA_CODES.map(({ code, city }) => (
                        <button
                            key={code}
                            type="button"
                            onClick={() => setArea(code)}
                            className={`flex justify-between items-center px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                                areaCode === code
                                    ? "bg-neutral-900 text-white"
                                    : "bg-neutral-50 hover:bg-neutral-100 text-neutral-700"
                            }`}
                        >
                            <span className="font-black">{code}</span>
                            <span className="text-[11px] font-medium opacity-70">{city}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
