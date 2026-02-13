import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Rocket, Code, Wrench } from "lucide-react";

/**
 * Placeholder component shown in production mode when features are not yet ready
 */
export function ProductionPlaceholder() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Rocket className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">OptimalAssign is Under Development</CardTitle>
          <CardDescription className="text-base mt-2">
            We're working hard to bring you mathematically optimal labor scheduling
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full flex-shrink-0">
                <Code className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-neutral-900 mb-1">Core Features in Progress</h3>
                <p className="text-sm text-neutral-600">
                  Our optimization engine, scheduling algorithms, and workforce management tools
                  are currently being built and tested.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-neutral-50 rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full flex-shrink-0">
                <Wrench className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-neutral-900 mb-1">Coming Soon</h3>
                <ul className="text-sm text-neutral-600 space-y-1 list-disc list-inside">
                  <li>AI-powered schedule optimization</li>
                  <li>Demand forecasting and labor planning</li>
                  <li>Employee management and constraints</li>
                  <li>Real-time analytics and reporting</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-200">
            <p className="text-sm text-neutral-500 text-center">
              Want to see development progress? Contact your administrator for access to the development environment.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
