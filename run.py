from src.app import create_app

app = create_app()

if __name__ == '__main__':
    print('Registered routes:')
    for rule in app.url_map.iter_rules():
        print(f"{rule.endpoint}: {rule.rule}")
    app.run(debug=True) 