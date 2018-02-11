gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/css" cp style.css gs://castaway/style.css
gsutil acl ch -u AllUsers:R gs://castaway/style.css

