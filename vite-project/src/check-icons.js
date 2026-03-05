// check-icons.js
console.log('Checking available icons...');
console.log('-----------------------------------');

try {
  const gi = require('react-icons/gi');
  console.log('✅ Game Icons (gi) package loaded successfully');
  console.log('Available Game Icons:');
  console.log('- GiSaturn:', gi.GiSaturn ? '✅' : '❌');
  console.log('- GiComet:', gi.GiComet ? '✅' : '❌');
  console.log('- GiMeteor:', gi.GiMeteor ? '✅' : '❌');
  console.log('- GiGalaxy:', gi.GiGalaxy ? '✅' : '❌');
  console.log('- GiPlanetCore:', gi.GiPlanetCore ? '✅' : '❌');
  console.log('- GiSpaceship:', gi.GiSpaceship ? '✅' : '❌');
  console.log('- GiRingedPlanet:', gi.GiRingedPlanet ? '✅' : '❌');
  console.log('- GiFallingStar:', gi.GiFallingStar ? '✅' : '❌');
  console.log('- GiStarShuriken:', gi.GiStarShuriken ? '✅' : '❌');
} catch (error) {
  console.log('❌ Error loading Game Icons:', error.message);
}

console.log('\n-----------------------------------');

try {
  const fa = require('react-icons/fa');
  console.log('✅ Font Awesome (fa) package loaded successfully');
  console.log('Available Font Awesome Icons:');
  console.log('- FaSaturn:', fa.FaSaturn ? '✅' : '❌');
  console.log('- FaMeteor:', fa.FaMeteor ? '✅' : '❌');
  console.log('- FaStar:', fa.FaStar ? '✅' : '❌');
  console.log('- FaGlobe:', fa.FaGlobe ? '✅' : '❌');
  console.log('- FaRocket:', fa.FaRocket ? '✅' : '❌');
  console.log('- FaUserAstronaut:', fa.FaUserAstronaut ? '✅' : '❌');
} catch (error) {
  console.log('❌ Error loading Font Awesome:', error.message);
}