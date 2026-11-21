from playwright.sync_api import sync_playwright
from pathlib import Path
from urllib.parse import urlparse
import json,mimetypes
root=Path('dist').resolve(); sample=json.loads(Path('.checks/db-plan.json').read_text())
with sync_playwright() as p:
 b=p.chromium.launch()
 page=b.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e: errors.append(str(e)))
 def local(route):
  url=urlparse(route.request.url)
  if url.netloc=='leanmonth.test':
   if url.path=='/api/workspace':route.fulfill(json=sample);return
   file=root/(url.path.lstrip('/') or 'index.html')
   if file.exists() and file.is_file():route.fulfill(path=str(file),content_type=mimetypes.guess_type(str(file))[0] or 'application/octet-stream');return
   route.fulfill(status=404,body='Not found');return
  route.continue_()
 page.route('**/*',local);page.goto('https://leanmonth.test/');page.get_by_role('heading',name='Welcome back, Ravi.').wait_for();page.evaluate('document.fonts.ready');page.wait_for_timeout(200);page.screenshot(path='.checks/dashboard-desktop.png');print('Desktop',page.locator('.welcome-hero').bounding_box(),page.locator('.dashboard-charts').bounding_box());
 for width in [1280,1024,768,590,375,320]:
  page.set_viewport_size({'width':width,'height':850});page.wait_for_timeout(100);print('Width',width,'body width',page.evaluate('document.documentElement.scrollWidth'),'hero',page.locator('.welcome-hero').bounding_box())
  if width==375:page.screenshot(path='.checks/dashboard-mobile.png',full_page=True)
 page.set_viewport_size({'width':1440,'height':900});page.get_by_role('button',name="Open Ravi's profile").click();page.get_by_role('dialog').wait_for();page.screenshot(path='.checks/profile-desktop.png');page.get_by_role('button',name='Close dialog').click()
 for name in ['Monthly planner','Simulation','Insights','Settings']:
  page.get_by_role('navigation',name='Control panel').get_by_role('link',name=name,exact=True).click();page.wait_for_timeout(100);page.screenshot(path='.checks/'+name.replace(' ','-')+'.png');assert not page.locator('.connection-state').count()
 print('Runtime errors:',errors);b.close();assert not errors
