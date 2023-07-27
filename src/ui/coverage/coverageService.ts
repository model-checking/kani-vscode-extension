// coverageService.ts

class CoverageService {
    private static instance: CoverageService;
    private cache: any;

    private constructor() {
        // Initialize the cache as needed
        this.cache = {};
    }

    public static getInstance(): CoverageService {
        if (!CoverageService.instance) {
        CoverageService.instance = new CoverageService();
        }
        return CoverageService.instance;
    }

    public setCache(data: any): void {
        this.cache = data;
    }

    public getCache(): any {
        return this.cache;
    }
}

export default CoverageService;
