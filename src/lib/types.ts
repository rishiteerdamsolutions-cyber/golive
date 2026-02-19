export interface PackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export interface ProjectAnalysis {
  framework: string;
  database: { type: string; envVars: string[] };
  paymentGateways: string[];
  buildCommand: string;
  outputDir: string;
  packageJson: PackageJson;
}
