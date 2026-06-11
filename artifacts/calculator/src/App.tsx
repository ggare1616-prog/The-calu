import { useState, useEffect, useCallback, useRef } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

type Operator = "+" | "-" | "×" | "÷" | null;

function Calculator() {
  const [currentValue, setCurrentValue] = useState<string>("0");
  const [previousValue, setPreviousValue] = useState<string | null>(null);
  const [operator, setOperator] = useState<Operator>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const formatNumber = (numStr: string) => {
    if (numStr === "Error" || numStr === "NaN" || numStr === "Infinity") return "Error";
    const parts = numStr.split(".");
    const integerPart = parts[0];
    const decimalPart = parts.length > 1 ? "." + parts[1] : "";
    
    // Add commas
    let formattedInteger = "";
    const isNegative = integerPart.startsWith("-");
    const absInteger = isNegative ? integerPart.slice(1) : integerPart;
    
    for (let i = 0; i < absInteger.length; i++) {
      if (i > 0 && (absInteger.length - i) % 3 === 0) {
        formattedInteger += ",";
      }
      formattedInteger += absInteger[i];
    }
    
    if (isNegative) formattedInteger = "-" + formattedInteger;
    
    // Convert to scientific notation if too long
    if (formattedInteger.length + decimalPart.length > 12) {
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
        return num.toExponential(6).replace("+", "");
      }
    }
    
    return formattedInteger + decimalPart;
  };

  const calculate = (a: number, b: number, op: Operator): number => {
    switch (op) {
      case "+": return a + b;
      case "-": return a - b;
      case "×": return a * b;
      case "÷": 
        if (b === 0) throw new Error("Divide by zero");
        return a / b;
      default: return b;
    }
  };

  const handleNumber = useCallback((num: string) => {
    setError(null);
    if (waitingForNewValue) {
      setCurrentValue(num);
      setWaitingForNewValue(false);
    } else {
      setCurrentValue(currentValue === "0" ? num : currentValue + num);
    }
  }, [currentValue, waitingForNewValue]);

  const handleDecimal = useCallback(() => {
    setError(null);
    if (waitingForNewValue) {
      setCurrentValue("0.");
      setWaitingForNewValue(false);
    } else if (!currentValue.includes(".")) {
      setCurrentValue(currentValue + ".");
    }
  }, [currentValue, waitingForNewValue]);

  const handleOperator = useCallback((op: Operator) => {
    setError(null);
    if (error) {
      setCurrentValue("0");
      setPreviousValue(null);
      setOperator(null);
      setError(null);
      return;
    }

    if (operator && !waitingForNewValue && previousValue !== null) {
      try {
        const result = calculate(parseFloat(previousValue), parseFloat(currentValue), operator);
        const resultStr = String(result);
        setCurrentValue(resultStr);
        setPreviousValue(resultStr);
      } catch (e) {
        setError("Error");
        setCurrentValue("Error");
        setPreviousValue(null);
        setOperator(null);
        setWaitingForNewValue(true);
        return;
      }
    } else {
      setPreviousValue(currentValue);
    }
    setOperator(op);
    setWaitingForNewValue(true);
  }, [currentValue, operator, previousValue, waitingForNewValue, error]);

  const handleEqual = useCallback(() => {
    if (!operator || previousValue === null || error) return;

    try {
      const result = calculate(parseFloat(previousValue), parseFloat(currentValue), operator);
      setCurrentValue(String(result));
      setPreviousValue(null);
      setOperator(null);
      setWaitingForNewValue(true);
    } catch (e) {
      setError("Error");
      setCurrentValue("Error");
      setPreviousValue(null);
      setOperator(null);
      setWaitingForNewValue(true);
    }
  }, [currentValue, operator, previousValue, error]);

  const handleClear = useCallback(() => {
    setCurrentValue("0");
    setPreviousValue(null);
    setOperator(null);
    setWaitingForNewValue(false);
    setError(null);
  }, []);

  const handleDelete = useCallback(() => {
    if (waitingForNewValue || error) return;
    setCurrentValue(currentValue.length > 1 ? currentValue.slice(0, -1) : "0");
  }, [currentValue, waitingForNewValue, error]);

  const handlePercentage = useCallback(() => {
    if (error) return;
    setCurrentValue(String(parseFloat(currentValue) / 100));
  }, [currentValue, error]);

  const handleToggleSign = useCallback(() => {
    if (error) return;
    setCurrentValue(String(parseFloat(currentValue) * -1));
  }, [currentValue, error]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (/[0-9]/.test(key)) handleNumber(key);
      else if (key === ".") handleDecimal();
      else if (key === "+" || key === "-") handleOperator(key as Operator);
      else if (key === "*") handleOperator("×");
      else if (key === "/") {
        e.preventDefault();
        handleOperator("÷");
      }
      else if (key === "Enter" || key === "=") {
        e.preventDefault();
        handleEqual();
      }
      else if (key === "Escape") handleClear();
      else if (key === "Backspace") handleDelete();
      else if (key === "%") handlePercentage();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNumber, handleDecimal, handleOperator, handleEqual, handleClear, handleDelete, handlePercentage]);

  const renderButton = (label: string, onClick: () => void, type: "number" | "operator" | "action" | "equals" = "number", className: string = "") => {
    let baseStyles = "relative flex items-center justify-center text-2xl font-medium rounded-xl select-none transition-all duration-75 active:scale-95 touch-manipulation ";
    
    if (type === "number") {
      baseStyles += "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-secondary-border shadow-sm ";
    } else if (type === "operator") {
      baseStyles += "bg-accent text-accent-foreground hover:bg-accent/80 border border-accent-border shadow-sm ";
    } else if (type === "action") {
      baseStyles += "bg-muted text-muted-foreground hover:bg-muted/80 border border-muted-border shadow-sm ";
    } else if (type === "equals") {
      baseStyles += "bg-primary text-primary-foreground hover:bg-primary/90 border border-primary-border shadow-md ";
    }

    return (
      <button
        type="button"
        className={`${baseStyles} ${className}`}
        onClick={onClick}
        data-testid={`btn-${label}`}
      >
        {label}
      </button>
    );
  };

  const displayValue = error ? "Error" : formatNumber(currentValue);
  const displayLength = displayValue.length;
  const textSize = displayLength > 10 ? "text-4xl" : displayLength > 7 ? "text-5xl" : "text-6xl";

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background p-4 font-sans">
      <div className="w-full max-w-sm rounded-3xl bg-card border border-card-border shadow-2xl overflow-hidden p-6 flex flex-col gap-6">
        
        {/* Display Area */}
        <div className="flex flex-col items-end justify-end h-32 w-full px-2">
          <div className="text-muted-foreground h-6 text-sm font-mono tracking-wider flex items-center justify-end w-full overflow-hidden text-ellipsis whitespace-nowrap" data-testid="display-previous">
            {previousValue !== null && operator !== null ? `${formatNumber(previousValue)} ${operator}` : ""}
          </div>
          <div 
            className={`font-mono font-medium text-foreground tracking-tight transition-all duration-200 ease-out flex items-center justify-end w-full overflow-hidden text-ellipsis whitespace-nowrap ${textSize}`}
            data-testid="display-current"
          >
            {displayValue}
          </div>
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-4 gap-3 h-[400px]">
          {/* Row 1 */}
          {renderButton("AC", handleClear, "action")}
          {renderButton("+/-", handleToggleSign, "action")}
          {renderButton("%", handlePercentage, "action")}
          {renderButton("÷", () => handleOperator("÷"), operator === "÷" && waitingForNewValue ? "equals" : "operator")}

          {/* Row 2 */}
          {renderButton("7", () => handleNumber("7"))}
          {renderButton("8", () => handleNumber("8"))}
          {renderButton("9", () => handleNumber("9"))}
          {renderButton("×", () => handleOperator("×"), operator === "×" && waitingForNewValue ? "equals" : "operator")}

          {/* Row 3 */}
          {renderButton("4", () => handleNumber("4"))}
          {renderButton("5", () => handleNumber("5"))}
          {renderButton("6", () => handleNumber("6"))}
          {renderButton("-", () => handleOperator("-"), operator === "-" && waitingForNewValue ? "equals" : "operator")}

          {/* Row 4 */}
          {renderButton("1", () => handleNumber("1"))}
          {renderButton("2", () => handleNumber("2"))}
          {renderButton("3", () => handleNumber("3"))}
          {renderButton("+", () => handleOperator("+"), operator === "+" && waitingForNewValue ? "equals" : "operator")}

          {/* Row 5 */}
          {renderButton("0", () => handleNumber("0"), "number", "col-span-2 aspect-auto")}
          {renderButton(".", handleDecimal)}
          {renderButton("=", handleEqual, "equals")}
        </div>
        
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Calculator} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
