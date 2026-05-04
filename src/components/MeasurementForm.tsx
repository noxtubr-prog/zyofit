import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, Ruler } from "lucide-react";

export interface MeasurementData {
  chest: string;
  waist: string;
  hip: string;
  length: string;
  shoulder: string;
  sleeve_length: string;
  unit: "inches" | "cm";
  file: File | null;
  notes: string;
}

interface MeasurementFormProps {
  value: MeasurementData;
  onChange: (data: MeasurementData) => void;
}

const FIELDS = [
  { key: "chest", label: "Chest" },
  { key: "waist", label: "Waist" },
  { key: "hip", label: "Hip" },
  { key: "length", label: "Length" },
  { key: "shoulder", label: "Shoulder" },
  { key: "sleeve_length", label: "Sleeve Length" },
] as const;

const MeasurementForm = ({ value, onChange }: MeasurementFormProps) => {
  const [mode, setMode] = useState<"manual" | "upload">("manual");
  const fileRef = useRef<HTMLInputElement>(null);

  const updateField = (field: string, val: string) => {
    // Only allow numeric values with optional decimal
    const cleaned = val.replace(/[^0-9.]/g, "");
    onChange({ ...value, [field]: cleaned });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size > 10 * 1024 * 1024) {
      return; // Max 10MB
    }
    onChange({ ...value, file });
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "manual" ? "accent" : "outline"}
          size="sm"
          onClick={() => setMode("manual")}
          className="flex-1"
        >
          <Ruler className="h-4 w-4 mr-1.5" /> Manual Entry
        </Button>
        <Button
          type="button"
          variant={mode === "upload" ? "accent" : "outline"}
          size="sm"
          onClick={() => setMode("upload")}
          className="flex-1"
        >
          <Upload className="h-4 w-4 mr-1.5" /> Upload Sheet
        </Button>
      </div>

      {/* Unit selector */}
      <div className="flex items-center gap-3">
        <Label className="text-sm text-muted-foreground">Unit:</Label>
        <div className="flex gap-2">
          {(["inches", "cm"] as const).map(u => (
            <Button
              key={u}
              type="button"
              variant={value.unit === u ? "accent" : "outline"}
              size="sm"
              onClick={() => onChange({ ...value, unit: u })}
            >
              {u === "inches" ? "Inches" : "Centimeters"}
            </Button>
          ))}
        </div>
      </div>

      {mode === "manual" ? (
        <div className="grid grid-cols-2 gap-3">
          {FIELDS.map(f => (
            <div key={f.key} className="space-y-1.5">
              <Label htmlFor={f.key} className="text-xs font-medium">
                {f.label} ({value.unit === "inches" ? "in" : "cm"})
              </Label>
              <Input
                id={f.key}
                type="text"
                inputMode="decimal"
                placeholder={`e.g. ${value.unit === "inches" ? "36" : "91"}`}
                value={value[f.key]}
                onChange={e => updateField(f.key, e.target.value)}
                className="rounded-xl h-10"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Upload your measurement sheet as an image (JPG, PNG) or PDF. Max 10MB.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          {value.file ? (
            <div className="flex items-center gap-3 p-3 bg-secondary rounded-xl">
              <FileText className="h-5 w-5 text-accent flex-shrink-0" />
              <span className="text-sm font-medium truncate flex-1">{value.file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({ ...value, file: null })}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full h-24 border-dashed rounded-xl"
              onClick={() => fileRef.current?.click()}
            >
              <div className="text-center">
                <Upload className="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to upload</span>
              </div>
            </Button>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="measurement-notes" className="text-xs font-medium">
          Additional Notes (optional)
        </Label>
        <Input
          id="measurement-notes"
          placeholder="Any special instructions for the tailor..."
          value={value.notes}
          onChange={e => onChange({ ...value, notes: e.target.value })}
          className="rounded-xl h-10"
        />
      </div>
    </div>
  );
};

export default MeasurementForm;
