// Test utility to verify diagnosis page navigation
// Run this in browser console to test the fix

export function testDiagnosisNavigation() {
  console.log('🧪 Testing Diagnosis Page Navigation...');
  
  // Test 1: Check if diagnosis route is accessible without authentication
  const testRouteAccess = () => {
    const diagnosisRoute = '/diagnose';
    console.log('✅ Test 1: Checking route accessibility...');
    console.log(`   Route: ${diagnosisRoute}`);
    console.log('   Expected: Should be accessible without login');
    
    // Try to navigate to diagnosis page
    window.location.href = diagnosisRoute;
  };
  
  // Test 2: Check if navigation links work
  const testNavigationLinks = () => {
    console.log('✅ Test 2: Checking navigation links...');
    
    // Check desktop sidebar link
    const desktopLink = document.querySelector('a[href="/diagnose"]');
    if (desktopLink) {
      console.log('   ✅ Desktop sidebar link found');
    } else {
      console.log('   ❌ Desktop sidebar link not found');
    }
    
    // Check mobile bottom nav link
    const mobileLink = document.querySelector('nav a[href="/diagnose"]');
    if (mobileLink) {
      console.log('   ✅ Mobile bottom nav link found');
    } else {
      console.log('   ❌ Mobile bottom nav link not found');
    }
  };
  
  // Test 3: Check if page loads correctly
  const testPageLoad = () => {
    setTimeout(() => {
      console.log('✅ Test 3: Checking page load...');
      
      // Check if diagnosis page elements are present
      const pageTitle = document.querySelector('h2');
      const uploadArea = document.querySelector('input[type="file"]');
      const analyzeButton = document.querySelector('button[type="submit"], .btn-primary');
      
      if (pageTitle && pageTitle.textContent.includes('Diagnosis')) {
        console.log('   ✅ Page title loaded correctly');
      } else {
        console.log('   ❌ Page title not found or incorrect');
      }
      
      if (uploadArea) {
        console.log('   ✅ Upload area found');
      } else {
        console.log('   ❌ Upload area not found');
      }
      
      if (analyzeButton) {
        console.log('   ✅ Analyze button found');
      } else {
        console.log('   ❌ Analyze button not found');
      }
      
      // Check if not redirected to login/onboarding
      if (window.location.pathname === '/diagnose') {
        console.log('   ✅ Still on diagnosis page (no redirect)');
      } else {
        console.log('   ❌ Redirected to:', window.location.pathname);
      }
    }, 2000);
  };
  
  // Run all tests
  testRouteAccess();
  setTimeout(testNavigationLinks, 1000);
  setTimeout(testPageLoad, 3000);
  
  console.log('🧪 Diagnosis navigation test started. Check console for results.');
}

// Auto-run test if in development mode
if (process.env.NODE_ENV === 'development') {
  // Uncomment to auto-run test
  // testDiagnosisNavigation();
}

export default testDiagnosisNavigation;
